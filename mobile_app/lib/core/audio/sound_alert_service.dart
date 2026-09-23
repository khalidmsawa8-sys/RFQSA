import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

/// Sound Alert Service for RFQ Radar Chime and Push Notifications
class SoundAlertService {
  static final SoundAlertService _instance = SoundAlertService._internal();
  factory SoundAlertService() => _instance;
  SoundAlertService._internal();

  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _isMuted = false;

  bool get isMuted => _isMuted;

  void toggleMute() {
    _isMuted = !_isMuted;
  }

  /// Play the distinctive RFQ Radar Siren / Chime when a new spare parts request arrives
  Future<void> playRfqRadarAlert() async {
    if (_isMuted) return;
    try {
      await _audioPlayer.stop();
      await _audioPlayer.play(
        AssetSource('sounds/rfq_alert.mp3'),
        volume: 1.0,
      );
    } catch (e) {
      if (kDebugMode) {
        print('Warning: Failed to play local audio asset: $e');
      }
    }
  }

  /// Play a gentle success confirmation tone (e.g. quote submitted, deal accepted)
  Future<void> playSuccessTone() async {
    if (_isMuted) return;
    try {
      await _audioPlayer.stop();
      await _audioPlayer.play(
        AssetSource('sounds/success_tone.mp3'),
        volume: 0.8,
      );
    } catch (e) {
      if (kDebugMode) {
        print('Warning: Failed to play success tone: $e');
      }
    }
  }

  void dispose() {
    _audioPlayer.dispose();
  }
}
