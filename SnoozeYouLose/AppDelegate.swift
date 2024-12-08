import UIKit
import Firebase
import FirebaseFirestore
import UserNotifications
import SwiftUI // Ensure this is here

class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        requestNotificationAuthorization() // Ensure notification permissions
        NotificationManager.shared.setupNotificationCategories() // Register categories
        return true
    }

    // Request notification authorization from the user
    private func requestNotificationAuthorization() {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("Error requesting notification authorization: \(error)")
            } else if granted {
                print("Notification permission granted.")
            } else {
                print("Notification permission denied.")
            }
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        guard let alarmID = userInfo["alarmID"] as? String else {
            completionHandler()
            return
        }

        // Fetch the alarm by ID from Firestore
        let alarm = fetchAlarmFromID(alarmID)

        // Present the AlarmActiveView
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            if let window = windowScene.windows.first {
                let alarmActiveView = AlarmActiveView(alarm: alarm, onStop: { self.stopAlarm() }, onSnooze: { self.snoozeAlarm() })
                window.rootViewController = UIHostingController(rootView: alarmActiveView)
            }
        }

        completionHandler()
    }

    // Fetch alarm from Firestore using the ID
    private func fetchAlarmFromID(_ id: String) -> Alarm {
        var fetchedAlarm: Alarm = Alarm() // Placeholder to ensure we return an alarm even in case of failure

        let db = Firestore.firestore()
        let alarmDocRef = db.collection("alarms").document(id)

        // Fetch the alarm document using the ID
        alarmDocRef.getDocument { (document, error) in
            if let error = error {
                print("Error fetching alarm: \(error)")
            } else if let document = document, document.exists, let data = document.data() {
                fetchedAlarm = Alarm(
                    time: data["time"] as? String ?? "",
                    label: data["label"] as? String ?? "",
                    isEnabled: data["isEnabled"] as? Bool ?? false,
                    sound: data["sound"] as? String ?? "Default Sound",
                    snoozePenalty: data["snoozePenalty"] as? Double ?? 0.0,
                    isRecurring: data["isRecurring"] as? Bool ?? false,
                    snoozeEnabled: data["snoozeEnabled"] as? Bool ?? true,
                    recurrenceDays: data["recurrenceDays"] as? [String] ?? [],
                    snoozeCount: data["snoozeCount"] as? Int ?? 0,
                    snoozeInterval: data["snoozeInterval"] as? Int ?? 5
                )
            }
        }

        return fetchedAlarm
    }

    private func stopAlarm() {
        // Logic to stop the alarm (maybe update Firestore)
        print("Stop the alarm!")
    }

    private func snoozeAlarm() {
        // Logic to snooze the alarm (update Firestore)
        print("Snooze the alarm!")
    }
}
