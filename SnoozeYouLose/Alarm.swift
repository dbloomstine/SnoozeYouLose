import Foundation
import FirebaseFirestore

struct Alarm: Identifiable, Codable {
    @DocumentID var id: String? = UUID().uuidString // Firestore ID reference with default
    var time: String = ""
    var label: String = ""
    var isEnabled: Bool = false
    var sound: String = "Default Sound"
    var snoozePenalty: Double = 0.0
    var isRecurring: Bool = false
    var snoozeEnabled: Bool = true
    var recurrenceDays: [String] = []
    var snoozeCount: Int = 0
    var snoozeInterval: Int = 5

    // Firestore requires an empty initializer when working with Codable
    init() {}

    init(time: String, label: String, isEnabled: Bool, sound: String, snoozePenalty: Double, isRecurring: Bool = false, snoozeEnabled: Bool = true, recurrenceDays: [String] = [], snoozeCount: Int = 0, snoozeInterval: Int = 5) {
        self.time = time
        self.label = label
        self.isEnabled = isEnabled
        self.sound = sound
        self.snoozePenalty = snoozePenalty
        self.isRecurring = isRecurring
        self.snoozeEnabled = snoozeEnabled
        self.recurrenceDays = recurrenceDays
        self.snoozeCount = snoozeCount
        self.snoozeInterval = snoozeInterval
    }
}
