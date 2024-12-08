import SwiftUI
import AVFoundation

struct EditAlarmView: View {
    @Binding var alarm: Alarm
    @State private var alarmTime = Date()
    @State private var selectedSound = ""
    @State private var snoozePenalty: Double = 0.0
    @State private var recurrenceDays: [String] = []
    @State private var audioPlayer: AVAudioPlayer?

    let alarmSounds = ["Default Sound", "Chime", "Digital", "Radar", "Bell", "Birdsong"]
    let weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    var onSave: (() -> Void)?

    var body: some View {
        Form {
            Section(header: Text("Time")) {
                DatePicker("Alarm Time", selection: $alarmTime, displayedComponents: .hourAndMinute)
                    .datePickerStyle(WheelDatePickerStyle())
            }

            Section(header: Text("Label")) {
                TextField("Label", text: $alarm.label)
            }

            Section(header: Text("Sound")) {
                Picker("Sound", selection: $selectedSound) {
                    ForEach(alarmSounds, id: \.self) { sound in
                        Text(sound).tag(sound)
                    }
                }
                .onChange(of: selectedSound) { newSound in
                    playSound(named: newSound)
                }
            }

            Section(header: Text("Snooze Penalty")) {
                Stepper(value: $snoozePenalty, in: 0...20, step: 0.5) {
                    Text("Penalty: \(snoozePenalty, specifier: "%.2f") $")
                }
            }

            Section(header: Text("Recurring Days")) {
                Toggle("Recurring Alarm", isOn: $alarm.isRecurring)
                if alarm.isRecurring {
                    ForEach(weekdays, id: \.self) { day in
                        Toggle(day, isOn: Binding(
                            get: { recurrenceDays.contains(day) },
                            set: { selected in
                                if selected {
                                    recurrenceDays.append(day)
                                } else {
                                    recurrenceDays.removeAll { $0 == day }
                                }
                            }
                        ))
                    }
                }
            }
        }
        .onAppear {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            if let alarmDate = formatter.date(from: alarm.time) {
                alarmTime = alarmDate
            }
            selectedSound = alarm.sound
            snoozePenalty = alarm.snoozePenalty
            recurrenceDays = alarm.recurrenceDays
        }
        .onDisappear {
            stopSound()
        }
        .navigationTitle("Edit Alarm")
        .navigationBarItems(trailing: Button("Save") {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            alarm.time = formatter.string(from: alarmTime)
            alarm.sound = selectedSound
            alarm.snoozePenalty = snoozePenalty
            alarm.recurrenceDays = recurrenceDays
            alarm.isRecurring = !recurrenceDays.isEmpty // Make sure it’s set if recurrence days are selected
            onSave?()
        })
    }

    private func playSound(named soundName: String) {
        guard let soundURL = Bundle.main.url(forResource: soundName, withExtension: "caf") else { return }
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
}
