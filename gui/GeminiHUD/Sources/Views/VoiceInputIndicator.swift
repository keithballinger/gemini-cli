import SwiftUI

struct VoiceInputIndicator: View {
    @EnvironmentObject var appState: AppState
    @State private var audioLevel: CGFloat = 0
    @State private var animationPhase: CGFloat = 0
    
    private let barCount = 5
    
    var body: some View {
        if appState.isVoiceInputActive {
            HStack(spacing: 3) {
                ForEach(0..<barCount, id: \.self) { index in
                    VoiceBar(
                        index: index,
                        audioLevel: audioLevel,
                        animationPhase: animationPhase
                    )
                }
            }
            .frame(width: 50, height: 30)
            .onAppear {
                startAnimation()
            }
            .onDisappear {
                stopAnimation()
            }
        }
    }
    
    private func startAnimation() {
        withAnimation(.linear(duration: 0.8).repeatForever(autoreverses: false)) {
            animationPhase = 1
        }
        
        // Simulate audio levels
        Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            withAnimation(.easeInOut(duration: 0.1)) {
                audioLevel = CGFloat.random(in: 0.2...1.0)
            }
        }
    }
    
    private func stopAnimation() {
        animationPhase = 0
        audioLevel = 0
    }
}

struct VoiceBar: View {
    let index: Int
    let audioLevel: CGFloat
    let animationPhase: CGFloat
    @EnvironmentObject var appState: AppState
    
    private var height: CGFloat {
        let baseHeight: CGFloat = 10
        let maxHeight: CGFloat = 30
        let variation = sin(Double(index) * .pi / 3 + Double(animationPhase) * .pi * 2)
        let heightMultiplier = CGFloat(variation) * 0.3 + 0.7
        return baseHeight + (maxHeight - baseHeight) * audioLevel * heightMultiplier
    }
    
    var body: some View {
        RoundedRectangle(cornerRadius: 2)
            .fill(appState.currentTheme.accentColor)
            .frame(width: 6, height: height)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: height)
    }
}