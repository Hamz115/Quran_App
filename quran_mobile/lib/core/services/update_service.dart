import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:version/version.dart';
import 'package:ota_update/ota_update.dart';

class UpdateInfo {
  final String version;
  final String downloadUrl;
  final String releaseNotes;
  final bool updateAvailable;

  const UpdateInfo({
    required this.version,
    required this.downloadUrl,
    required this.releaseNotes,
    required this.updateAvailable,
  });
}

class UpdateService {
  static const _repoOwner = 'Hamz115';
  static const _repoName = 'Quran_App';
  static const _apiUrl =
      'https://api.github.com/repos/$_repoOwner/$_repoName/releases/latest';

  final Dio _dio = Dio();

  /// Check GitHub Releases for a newer version.
  /// Returns [UpdateInfo] with details, or updateAvailable=false if current.
  Future<UpdateInfo> checkForUpdate() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = Version.parse(packageInfo.version);

      final response = await _dio.get(
        _apiUrl,
        options: Options(headers: {
          'Accept': 'application/vnd.github+json',
        }),
      );

      if (response.statusCode != 200) {
        return const UpdateInfo(
          version: '',
          downloadUrl: '',
          releaseNotes: '',
          updateAvailable: false,
        );
      }

      final data = response.data as Map<String, dynamic>;
      final tagName = (data['tag_name'] as String? ?? '').replaceFirst('v', '');
      final releaseNotes = data['body'] as String? ?? '';

      if (tagName.isEmpty) {
        return const UpdateInfo(
          version: '',
          downloadUrl: '',
          releaseNotes: '',
          updateAvailable: false,
        );
      }

      final latestVersion = Version.parse(tagName);

      // Find the APK asset
      String apkUrl = '';
      final assets = data['assets'] as List<dynamic>? ?? [];
      for (final asset in assets) {
        final name = asset['name'] as String? ?? '';
        if (name.endsWith('.apk')) {
          apkUrl = asset['browser_download_url'] as String? ?? '';
          break;
        }
      }

      return UpdateInfo(
        version: tagName,
        downloadUrl: apkUrl,
        releaseNotes: releaseNotes,
        updateAvailable: latestVersion > currentVersion && apkUrl.isNotEmpty,
      );
    } catch (e) {
      // Network error, no internet, no releases yet, etc.
      return const UpdateInfo(
        version: '',
        downloadUrl: '',
        releaseNotes: '',
        updateAvailable: false,
      );
    }
  }

  /// Download and install the APK via OTA.
  /// Returns a stream of [OtaEvent] with download progress and status.
  Stream<OtaEvent> downloadAndInstall(String url) {
    return OtaUpdate().execute(url, destinationFilename: 'qurantrack.apk');
  }
}
