import SwiftUI
import Firebase

@main
struct SnoozeYouLoseApp: App {
    // Add this line for the AppDelegate
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        WindowGroup {
            AlarmListView()
        }
    }
}
