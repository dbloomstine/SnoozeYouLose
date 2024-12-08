import SwiftUI

struct PenaltyLogView: View {
    let alarms: [Alarm]

    var body: some View {
        NavigationView {
            List {
                ForEach(alarms.filter { $0.snoozeCount > 0 }) { alarm in
                    VStack(alignment: .leading) {
                        Text(alarm.label)
                            .font(.headline)
                        Text("Total Snoozes: \(alarm.snoozeCount)")
                        Text("Total Penalty: $\(Double(alarm.snoozeCount) * alarm.snoozePenalty, specifier: "%.2f")")
                    }
                    .padding(.vertical, 5)
                }
            }
            .navigationTitle("Penalty Log")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        // Dismiss the view
                    }
                }
            }
        }
    }
}
