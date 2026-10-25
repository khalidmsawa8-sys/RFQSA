import 'dart:io';
import 'dart:convert';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/api/api_endpoints.dart';

/// Media Service for Image Capture, Compression, Voice Note Recording, and Backend Uploads
class MediaService {
  final ImagePicker _picker = ImagePicker();
  final AudioRecorder _audioRecorder = AudioRecorder();
  final ApiClient _apiClient;

  MediaService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Pick Image from Camera or Gallery with Automatic Compression
  Future<File?> pickAndCompressImage({required ImageSource source}) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (pickedFile == null) return null;

      // Compress Image to ~300-500 KB
      final dir = await getTemporaryDirectory();
      final targetPath = '${dir.path}/compressed_${DateTime.now().millisecondsSinceEpoch}.jpg';

      final XFile? compressedXFile = await FlutterImageCompress.compressAndGetFile(
        pickedFile.path,
        targetPath,
        quality: 70,
        minWidth: 1024,
        minHeight: 1024,
      );

      if (compressedXFile != null) {
        return File(compressedXFile.path);
      }
      return File(pickedFile.path);
    } catch (_) {
      return null;
    }
  }

  /// Upload Part Image to Backend Server (/api/upload-part-image)
  Future<String?> uploadImage(File file, {void Function(int sent, int total)? onProgress}) async {
    try {
      final response = await _apiClient.uploadFile(
        ApiEndpoints.uploadPartImage,
        file: file,
        onProgress: onProgress,
      );

      if (response.success && response.data != null) {
        final data = response.data;
        if (data is Map<String, dynamic>) {
          String? url = data['url']?.toString() ?? data['pathname']?.toString();
          if (url != null && url.isNotEmpty) {
            if (url.startsWith('/')) {
              url = 'https://rfqsa.tech$url';
            }
            return url;
          }
        }
      }
    } catch (_) {}

    // Resilient Fallback: encode to base64 Data URL if server upload fails
    try {
      if (await file.exists()) {
        final bytes = await file.readAsBytes();
        final b64 = base64Encode(bytes);
        return 'data:image/jpeg;base64,$b64';
      }
    } catch (_) {}
    return null;
  }

  /// Upload Voice Note to Backend Server
  Future<String?> uploadVoiceNote(File file) async {
    try {
      final response = await _apiClient.uploadFile(
        ApiEndpoints.uploadPartImage,
        file: file,
      );

      if (response.success && response.data != null) {
        final data = response.data;
        if (data is Map<String, dynamic>) {
          return data['url'] ?? data['pathname'];
        }
      }
    } catch (_) {}
    return null;
  }

  /// Start Audio Voice Note Recording
  Future<void> startVoiceRecording() async {
    if (await _audioRecorder.hasPermission()) {
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.m4a';

      await _audioRecorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc, bitRate: 64000),
        path: path,
      );
    }
  }

  /// Stop Audio Voice Note Recording and return File
  Future<File?> stopVoiceRecording() async {
    final path = await _audioRecorder.stop();
    if (path != null) {
      return File(path);
    }
    return null;
  }

  /// Check if currently recording
  Future<bool> isRecording() async {
    return await _audioRecorder.isRecording();
  }

  void dispose() {
    _audioRecorder.dispose();
  }
}
