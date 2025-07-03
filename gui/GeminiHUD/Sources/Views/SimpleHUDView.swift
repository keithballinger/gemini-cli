import SwiftUI

struct SimpleHUDView: View {
    var body: some View {
        VStack {
            Text("Gemini HUD Test")
                .font(.title)
                .padding()
            
            Text("If you can see this, the app launched!")
                .padding()
        }
        .frame(width: 400, height: 200)
        .background(Color.black.opacity(0.8))
        .foregroundColor(.white)
    }
}