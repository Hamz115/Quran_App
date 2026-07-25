import 'dart:async';
import 'package:flutter/material.dart';
import 'package:ota_update/ota_update.dart';
import '../../config/app_colors.dart';
import '../../core/services/update_service.dart';

class UpdateDialog extends StatefulWidget {
  final UpdateInfo updateInfo;
  final UpdateService updateService;
  final bool isDarkMode;

  const UpdateDialog({
    super.key,
    required this.updateInfo,
    required this.updateService,
    required this.isDarkMode,
  });

  /// Show the update dialog. Returns true if user started the update.
  static Future<bool> show(
    BuildContext context, {
    required UpdateInfo updateInfo,
    required UpdateService updateService,
    required bool isDarkMode,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => UpdateDialog(
        updateInfo: updateInfo,
        updateService: updateService,
        isDarkMode: isDarkMode,
      ),
    );
    return result ?? false;
  }

  @override
  State<UpdateDialog> createState() => _UpdateDialogState();
}

class _UpdateDialogState extends State<UpdateDialog> {
  bool _downloading = false;
  double _progress = 0;
  String _status = '';
  String? _error;
  StreamSubscription<OtaEvent>? _subscription;

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  void _startDownload() {
    setState(() {
      _downloading = true;
      _status = 'Downloading...';
      _error = null;
    });

    _subscription = widget.updateService
        .downloadAndInstall(widget.updateInfo.downloadUrl)
        .listen(
          (event) {
            setState(() {
              if (event.status == OtaStatus.DOWNLOADING) {
                _progress = double.tryParse(event.value ?? '0') ?? 0;
                _status = 'Downloading... ${_progress.toStringAsFixed(0)}%';
              } else if (event.status == OtaStatus.INSTALLING) {
                _status = 'Installing...';
                _progress = 100;
              } else if (event.status == OtaStatus.ALREADY_RUNNING_ERROR) {
                _error = 'Download already in progress';
                _downloading = false;
              } else if (event.status ==
                  OtaStatus.PERMISSION_NOT_GRANTED_ERROR) {
                _error =
                    'Install permission denied. Please allow app installs from this source in Settings.';
                _downloading = false;
              } else if (event.status == OtaStatus.INTERNAL_ERROR) {
                _error = 'Download failed: ${event.value}';
                _downloading = false;
              }
            });
          },
          onError: (e) {
            setState(() {
              _error = 'Download failed: $e';
              _downloading = false;
            });
          },
        );
  }

  @override
  Widget build(BuildContext context) {
    final dark = widget.isDarkMode;

    return AlertDialog(
      backgroundColor: AppColors.surface(dark),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: BorderSide(color: AppColors.border(dark).withOpacity(0.72)),
      ),
      title: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.system_update_rounded,
              color: Colors.white,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Update Available',
              style: TextStyle(color: AppColors.text(dark)),
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Version ${widget.updateInfo.version} is available.',
            style: TextStyle(
              color: AppColors.text(dark),
              fontWeight: FontWeight.w600,
            ),
          ),
          if (widget.updateInfo.releaseNotes.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              constraints: const BoxConstraints(maxHeight: 150),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.softSurface(dark),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border(dark)),
              ),
              child: SingleChildScrollView(
                child: Text(
                  widget.updateInfo.releaseNotes,
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary(dark),
                  ),
                ),
              ),
            ),
          ],
          if (_downloading) ...[
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: _progress / 100,
              backgroundColor: AppColors.border(dark),
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.cyan500),
            ),
            const SizedBox(height: 8),
            Text(
              _status,
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary(dark),
              ),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: TextStyle(fontSize: 13, color: AppColors.error),
            ),
          ],
        ],
      ),
      actions: _downloading
          ? null
          : [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text(
                  'Later',
                  style: TextStyle(color: AppColors.textSecondary(dark)),
                ),
              ),
              ElevatedButton(
                onPressed: _startDownload,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.cyan500,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text('Update Now'),
              ),
            ],
    );
  }
}
