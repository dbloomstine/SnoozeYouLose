import Foundation

struct PenaltyLogEntry: Identifiable, Codable {
    var id: String
    var date: String
    var amount: Double
    var alarmLabel: String
}
