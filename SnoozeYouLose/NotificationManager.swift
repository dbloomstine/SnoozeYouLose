import Foundation
import FirebaseFirestore
import UserNotifications

class NotificationManager: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationManager()
    private let db = Firestore.firestore().collection("alarms")

    private override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
        requestAuthorization()
    }

    // Public method to setup notification categories (Snooze, Turn Off actions)
    public func setupNotificationCategories() {
        // Define actions for notifications (Snooze and Turn Off)
        let snoozeAction = UNNotificationAction(identifier: "snoozeAction", title: "Snooze", options: .foreground)
        let turnOffAction = UNNotificationAction(identifier: "turnOffAction", title: "Turn Off", options: .destructive)

        // Create a category to group these actions
        let alarmCategory = UNNotificationCategory(identifier: "alarmCategory", actions: [snoozeAction, turnOffAction], intentIdentifiers: [], options: [])

        // Register the category with the notification center
        UNUserNotificationCenter.current().setNotificationCategories([alarmCategory])
    }

    // Request notification authorization from the user
    private func requestAuthorization() {
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

    // Schedule a notification for an alarm
    func scheduleNotification(for alarm: Alarm) {
        guard alarm.isEnabled else { return }

        let content = UNMutableNotificationContent()
        content.title = alarm.label
        content.body = "Time to wake up!"
        content.sound = UNNotificationSound.default
        content.categoryIdentifier = "alarmCategory"  // Category identifier for actions

        // Configure the time for the notification
        var dateComponents = DateComponents()
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"

        if let alarmTime = formatter.date(from: alarm.time) {
            dateComponents = Calendar.current.dateComponents([.hour, .minute], from: alarmTime)
        }

        // Handle recurring alarms based on selected days of the week
        if alarm.isRecurring, !alarm.recurrenceDays.isEmpty {
            for day in alarm.recurrenceDays {
                let triggerDate = calculateTriggerDate(for: alarm, on: day)
                let trigger = UNCalendarNotificationTrigger(dateMatching: triggerDate, repeats: true)
                let request = UNNotificationRequest(identifier: alarm.id ?? UUID().uuidString, content: content, trigger: trigger)

                UNUserNotificationCenter.current().add(request) { error in
                    if let error = error {
                        print("Error scheduling notification: \(error)")
                    } else {
                        print("Notification scheduled for alarm: \(alarm.label) on \(day)")
                    }
                }
            }
        } else {
            // Non-recurring alarm - just one-time trigger
            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: false)
            let request = UNNotificationRequest(identifier: alarm.id ?? UUID().uuidString, content: content, trigger: trigger)

            UNUserNotificationCenter.current().add(request) { error in
                if let error = error {
                    print("Error scheduling notification: \(error)")
                } else {
                    print("Notification scheduled for alarm: \(alarm.label)")
                }
            }
        }
    }

    // Remove a scheduled notification
    func removeNotification(for alarmID: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [alarmID])
    }

    // Handle snooze action for an alarm
    func handleSnooze(for alarm: Alarm) {
        var snoozedAlarm = alarm
        snoozedAlarm.snoozeCount += 1
        snoozedAlarm.isEnabled = true
        updatePenalty(for: snoozedAlarm)

        // Calculate new trigger time for snooze
        let snoozeInterval = TimeInterval(alarm.snoozeInterval * 60)
        let newTriggerTime = Date().addingTimeInterval(snoozeInterval)
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        snoozedAlarm.time = formatter.string(from: newTriggerTime)

        // Schedule snoozed notification
        scheduleNotification(for: snoozedAlarm)
    }

    // Update the snooze penalty count in Firestore
    private func updatePenalty(for alarm: Alarm) {
        guard let id = alarm.id else { return }

        db.document(id).updateData(["snoozeCount": alarm.snoozeCount]) { error in
            if let error = error {
                print("Error updating penalty: \(error)")
            } else {
                print("Penalty updated for alarm: \(alarm.label), new snooze count: \(alarm.snoozeCount)")
            }
        }
    }

    // Handle user interaction with notification actions (Snooze or Turn Off)
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        guard let alarmID = userInfo["alarmID"] as? String else {
            completionHandler()
            return
        }

        switch response.actionIdentifier {
        case "snoozeAction":
            if let alarm = findAlarm(by: alarmID) {
                handleSnooze(for: alarm)
            }
        case "turnOffAction":
            removeNotification(for: alarmID)
        default:
            break
        }
        completionHandler()
    }

    // Fetch an alarm from Firestore (implement as needed)
    private func findAlarm(by id: String) -> Alarm? {
        // Implement fetching alarm from Firestore as needed
        return nil
    }

    // Helper function to calculate the trigger date based on the selected day of the week
    private func calculateTriggerDate(for alarm: Alarm, on day: String) -> DateComponents {
        let calendar = Calendar.current
        var triggerDate = calendar.dateComponents([.year, .month, .day], from: Date())

        // Set the time based on the alarm
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        if let alarmTime = formatter.date(from: alarm.time) {
            let timeComponents = calendar.dateComponents([.hour, .minute], from: alarmTime)
            triggerDate.hour = timeComponents.hour
            triggerDate.minute = timeComponents.minute
        }

        // Adjust to the correct weekday
        let weekday = getWeekdayNumber(from: day)
        triggerDate.weekday = weekday

        return triggerDate
    }

    // Helper function to convert weekday name to numeric value
    private func getWeekdayNumber(from day: String) -> Int {
        switch day {
        case "Sunday": return 1
        case "Monday": return 2
        case "Tuesday": return 3
        case "Wednesday": return 4
        case "Thursday": return 5
        case "Friday": return 6
        case "Saturday": return 7
        default: return 1
        }
    }
}
