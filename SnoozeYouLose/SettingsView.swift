import SwiftUI
import FirebaseFirestore

struct SettingsView: View {
    @AppStorage("snoozeInterval") private var snoozeInterval: Int = 5 // Default snooze interval in minutes
    private let db = Firestore.firestore()
    
    var body: some View {
        Form {
            Section(header: Text("Alarm Settings")) {
                // Snooze Interval Setting
                Stepper(value: $snoozeInterval, in: 1...30, step: 1) {
                    Text("Snooze Interval: \(snoozeInterval) min")
                }
                .onChange(of: snoozeInterval) { newValue in
                    saveSnoozeInterval(newValue)
                }
            }
        }
        .navigationTitle("Settings")
        .onAppear {
            loadSnoozeInterval()
        }
    }
    
    // Save snooze interval to Firestore
    private func saveSnoozeInterval(_ interval: Int) {
        db.collection("settings").document("snoozeInterval").setData(["interval": interval]) { error in
            if let error = error {
                print("Error saving snooze interval: \(error)")
            }
        }
    }
    
    // Load snooze interval from Firestore
    private func loadSnoozeInterval() {
        db.collection("settings").document("snoozeInterval").getDocument { snapshot, error in
            if let error = error {
                print("Error loading snooze interval: \(error)")
                return
            }
            
            if let data = snapshot?.data(), let interval = data["interval"] as? Int {
                snoozeInterval = interval
            }
        }
    }
}
