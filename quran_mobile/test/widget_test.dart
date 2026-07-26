import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:quran_mobile/presentation/widgets/tour_tooltip.dart';

void main() {
  testWidgets('TourTooltip renders tutorial content and advances', (
    WidgetTester tester,
  ) async {
    var nextTapped = false;
    var skipTapped = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TourTooltip(
            title: 'Welcome to QuranTrack!',
            description: 'Track recitation mistakes and manage sessions.',
            currentStep: 0,
            totalSteps: 9,
            isDarkMode: true,
            isLastStep: false,
            onNext: () => nextTapped = true,
            onSkip: () => skipTapped = true,
          ),
        ),
      ),
    );

    expect(find.text('Step 1 of 9'), findsOneWidget);
    expect(find.text('Welcome to QuranTrack!'), findsOneWidget);
    expect(find.text('Track recitation mistakes and manage sessions.'), findsOneWidget);
    expect(find.text('Skip'), findsOneWidget);
    expect(find.text('Next'), findsOneWidget);

    await tester.tap(find.text('Next'));
    await tester.pump();
    expect(nextTapped, isTrue);

    await tester.tap(find.text('Skip'));
    await tester.pump();
    expect(skipTapped, isTrue);
  });

  testWidgets('interactive TourTooltip exposes a working Try it action', (
    WidgetTester tester,
  ) async {
    var tryItTapped = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TourTooltip(
            title: 'Start a Session',
            description: 'Open the session form.',
            currentStep: 2,
            totalSteps: 24,
            isDarkMode: false,
            isLastStep: false,
            isInteractive: true,
            onNext: () => tryItTapped = true,
            onSkip: () {},
          ),
        ),
      ),
    );

    expect(find.text('Try it'), findsOneWidget);
    expect(find.text('Next'), findsNothing);

    await tester.tap(find.text('Try it'));
    await tester.pump();
    expect(tryItTapped, isTrue);
  });
}
