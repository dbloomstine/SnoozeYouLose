import Foundation
import FirebaseCore
import FirebaseFirestore

class FirestoreManager {
    private let db = Firestore.firestore()

    // Save an alarm to Firestore
    func saveAlarm(alarm: Alarm, completion: @escaping (Error?) -> Void) {
        guard let id = alarm.id else {
            let error = NSError(domain: "FirestoreManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Alarm ID is nil"])
            completion(error)
            return
        }

        let alarmData: [String: Any] = [
            "time": alarm.time,
            "label": alarm.label,
            "isEnabled": alarm.isEnabled,
            "sound": alarm.sound,
            "snoozePenalty": alarm.snoozePenalty,
            "isRecurring": alarm.isRecurring,
            "snoozeEnabled": alarm.snoozeEnabled,
            "recurrenceDays": alarm.recurrenceDays,
            "snoozeCount": alarm.snoozeCount,
            "snoozeInterval": alarm.snoozeInterval
        ]

        db.collection("alarms").document(id).setData(alarmData) { error in
            if let error = error {
                print("Error saving alarm: \(error.localizedDescription)")
                completion(error)
            } else {
                print("Alarm saved successfully")
                completion(nil)
            }
        }
    }

    // Fetch all alarms from Firestore
    func fetchAlarms(completion: @escaping ([Alarm]?, Error?) -> Void) {
        db.collection("alarms").getDocuments { snapshot, error in
            if let error = error {
                print("Error fetching alarms: \(error.localizedDescription)")
                completion(nil, error)
                return
            }
            
            var alarms: [Alarm] = []
            snapshot?.documents.forEach { document in
                let data = document.data()
                let alarm = Alarm(
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
                alarms.append(alarm)
            }
            completion(alarms, nil)
        }
    }

    // Delete an alarm from Firestore
    func deleteAlarm(alarmID: String, completion: @escaping (Error?) -> Void) {
        db.collection("alarms").document(alarmID).delete { error in
            if let error = error {
                print("Error deleting alarm: \(error.localizedDescription)")
                completion(error)
            } else {
                print("Alarm deleted successfully")
                completion(nil)
            }
        }
    }

    // Log a penalty for snoozing an alarm
    func logPenalty(alarm: Alarm, amount: Double) {
        let penaltyLogEntry = PenaltyLogEntry(
            id: UUID().uuidString,
            date: DateFormatter.localizedString(from: Date(), dateStyle: .medium, timeStyle: .short),
            amount: amount,
            alarmLabel: alarm.label
        )
        
        do {
            try db.collection("penaltyLogs").document(penaltyLogEntry.id).setData(from: penaltyLogEntry)
            print("Penalty logged for \(alarm.label): \(amount)$")
        } catch {
            print("Error logging penalty: \(error.localizedDescription)")
        }
    }
}
