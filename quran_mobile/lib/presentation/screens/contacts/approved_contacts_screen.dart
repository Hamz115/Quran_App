import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/providers.dart';
import '../../widgets/approved_ui.dart';
import '../classes/create_class_screen.dart';
import '../reports/approved_reports_screen.dart';

class ApprovedContactsScreen extends ConsumerStatefulWidget {
  const ApprovedContactsScreen({super.key});

  @override
  ConsumerState<ApprovedContactsScreen> createState() =>
      _ApprovedContactsScreenState();
}

class _ApprovedContactsScreenState
    extends ConsumerState<ApprovedContactsScreen> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final contactsAsync = ref.watch(teacherStudentsProvider);
    return Scaffold(
      backgroundColor: AppColors.ivory,
      body: Column(
        children: [
          ApprovedBrandHeader(initials: _initials(user?.fullName ?? 'QT')),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.emerald,
              onRefresh: () async => ref.invalidate(teacherStudentsProvider),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
                children: [
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back),
                        tooltip: 'Back',
                      ),
                      Expanded(
                        child: Text(
                          'Contacts',
                          style: Theme.of(context).textTheme.headlineLarge,
                        ),
                      ),
                      SizedBox(
                        width: 142,
                        child: ApprovedPrimaryButton(
                          label: 'Add Contact',
                          icon: Icons.person_add_alt_1,
                          onPressed: _showAddContact,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _searchController,
                    onChanged: (value) =>
                        setState(() => _query = value.trim().toLowerCase()),
                    decoration: const InputDecoration(
                      hintText: 'Search contacts',
                      prefixIcon: Icon(Icons.search),
                    ),
                  ),
                  const SizedBox(height: 16),
                  contactsAsync.when(
                    loading: () => const Padding(
                      padding: EdgeInsets.all(48),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (error, _) => ApprovedCard(
                      child: Text('Unable to load contacts: $error'),
                    ),
                    data: (contacts) {
                      final visible = contacts
                          .where(
                            (contact) =>
                                contact.name.toLowerCase().contains(_query),
                          )
                          .toList();
                      return Column(
                        children: [
                          ApprovedCard(
                            child: Row(
                              children: [
                                _Stat(
                                  value: '${contacts.length}',
                                  label: 'Contacts',
                                ),
                                _Stat(
                                  value: '${contacts.length}',
                                  label: 'Available',
                                ),
                                const _Stat(value: '0', label: 'Attention'),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          if (visible.isEmpty)
                            const ApprovedCard(
                              child: Padding(
                                padding: EdgeInsets.symmetric(vertical: 28),
                                child: Center(
                                  child: Text('No matching contacts.'),
                                ),
                              ),
                            )
                          else
                            ...visible.map(
                              (contact) => Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: _ContactCard(
                                  name: contact.name,
                                  onSession: () => _newSession(contact.id),
                                  onReport: () => _openReport(contact.id),
                                ),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showAddContact() async {
    final controller = TextEditingController();
    String? error;
    var loading = false;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Add contact'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Enter the QuranTrack account email.'),
              const SizedBox(height: 14),
              TextField(
                controller: controller,
                keyboardType: TextInputType.emailAddress,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'Email address',
                  errorText: error,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed:
                  loading ? null : () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: loading
                  ? null
                  : () async {
                      final email = controller.text.trim();
                      if (!email.contains('@')) {
                        setDialogState(() => error = 'Enter a valid email');
                        return;
                      }
                      setDialogState(() {
                        loading = true;
                        error = null;
                      });
                      try {
                        final name = await addStudentByEmail(ref, email);
                        if (!dialogContext.mounted) return;
                        Navigator.pop(dialogContext);
                        ScaffoldMessenger.of(this.context).showSnackBar(
                          SnackBar(content: Text('$name added to contacts')),
                        );
                      } catch (e) {
                        setDialogState(() {
                          loading = false;
                          error = e.toString().replaceAll('Exception: ', '');
                        });
                      }
                    },
              child: loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Add Contact'),
            ),
          ],
        ),
      ),
    );
    controller.dispose();
  }

  void _newSession(String contactId) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CreateClassScreen(studentId: contactId),
      ),
    );
  }

  void _openReport(String contactId) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ApprovedReportsScreen(initialContactId: contactId),
      ),
    );
  }

  static String _initials(String value) => value
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .take(2)
      .map((part) => part[0])
      .join()
      .toUpperCase();
}

class _Stat extends StatelessWidget {
  final String value;
  final String label;

  const _Stat({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: Theme.of(context).textTheme.headlineMedium),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  final String name;
  final VoidCallback onSession;
  final VoidCallback onReport;

  const _ContactCard({
    required this.name,
    required this.onSession,
    required this.onReport,
  });

  @override
  Widget build(BuildContext context) {
    return ApprovedCard(
      child: Row(
        children: [
          ApprovedInitialsAvatar(name: name, size: 54),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 3),
                const Text('Reciter • Ready for a session'),
              ],
            ),
          ),
          PopupMenuButton<String>(
            onSelected: (value) =>
                value == 'session' ? onSession() : onReport(),
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'session', child: Text('New session')),
              PopupMenuItem(value: 'report', child: Text('View report')),
            ],
          ),
        ],
      ),
    );
  }
}
