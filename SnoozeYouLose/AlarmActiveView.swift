import SwiftUI
import AVFoundation
import FirebaseFirestore

struct AlarmActiveView: View {
    @Environment(\.presentationMode) var presentationMode
    @State private var audioPlayer: AVAudioPlayer?
    @State var alarm: Alarm
    var onStop: () -> Void
    var onSnooze: () -> Void

    private let db = Firestore.firestore().collection("alarms")
    
    var body: some View {
        VStack {
            Text("Alarm is Ringing!")
                .font(.largeTitle)
                .fontWeight(.bold)
                .padding()
            
            Text(alarm.label)
                .font(.title)
                .foregroundColor(.gray)
                .padding()

            Spacer()
            
            Text("Time: \(alarm.time)")
                .font(.title2)
                .padding()

            Spacer()

            HStack {
                Button(action: snoozeAlarm) {
                    Text("Snooze")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(8)
                }
                .padding()
                
                Button(action: stopAlarm) {
                    Text("Stop")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding()
                        .background(Color.red)
                        .cornerRadius(8)
                }
                .padding()
            }

            Spacer()
        }
        .onAppear {
            playAlarmSound()
        }
        .onDisappear {
            stopSound()
        }
    }

    private func playAlarmSound() {
        guard let soundURL = Bundle.main.url(forResource: alarm.sound, withExtension: "caf") else { return }
        do {
            audioPlayer = try AVAudioPlayer(contentsOf: soundURL)
            audioPlayer?.play()
        } catch {
            print("Error playing sound: \(error)")
        }
    }

    private func stopSound() {
        audioPlayer?.stop()
    }

    private func stopAlarm() {
        alarm.isEnabled = false  // Mark alarm as stopped in Firestore
        updateAlarmInFirestore()  // Update Firestore with the change
        
        stopSound()  // Stop the alarm sound
        
        onStop()  // This could be used to notify the parent view or perform other actions
        
        presentationMode.wrappedValue.dismiss()  // Close the AlarmActiveView and return to previous view
    }

    private func snoozeAlarm() {
        // Increment snooze count and apply penalty
        alarm.snoozeCount += 1
        let penaltyAmount = alarm.snoozePenalty
        logPenalty(amount: penaltyAmount)

        // Calculate new alarm time based on snooze interval
        let snoozeTime = Date().addingTimeInterval(TimeInterval(alarm.snoozeInterval * 60))
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        alarm.time = formatter.string(from: snoozeTime)

        // Update Firestore with new snooze time and increment snooze count
        updateAlarmInFirestore()
        
        // Reschedule the notification
        NotificationManager.shared.removeNotification(for: alarm.id ?? UUID().uuidString)
        NotificationManager.shared.scheduleNotification(for: alarm)

        // Stop sound and dismiss
        stopSound()
        onSnooze()
    }

    private func updateAlarmInFirestore() {
        do {
            try db.document(alarm.id ?? UUID().uuidString).setData(from: alarm)
            print("Alarm updated in Firestore: \(alarm.id ?? "unknown")")
        } catch {
            print("Error updating alarm in Firestore: \(error)")
        }
    }

    private func logPenalty(amount: Double) {
        // Log the penalty in Firestore
        let penaltyLogEntry = PenaltyLogEntry(
            id: UUID().uuidString,
            date: DateFormatter.localizedString(from: Date(), dateStyle: .medium, timeStyle: .short),
            amount: amount,
            alarmLabel: alarm.label
        )

        // Save to Firestore under "penaltyLogs" collection with specific document ID
        do {
            try db.document("penaltyLogs/\(penaltyLogEntry.id)").setData(from: penaltyLogEntry)
            print("Penalty logged for alarm \(alarm.label): \(amount)$")
        } catch {
            print("Error logging penalty: \(error)")
        }
    }
}
