# Meterun - Running Plans

Meterun is a dynamic, web-based running plan generator designed to help runners achieve their distance goals through personalized training schedules. Whether you're aiming for your first 5K or training for a faster 15K, Meterun adapts to your current fitness level.

## Features

-   **Personalized Plan Generation**: Creates custom training plans for 5K, 10K, and 15K distances based on your inputs.
-   **Dynamic Scheduling**: Automatically generates a multi-week schedule that includes:
    -   **Easy Runs**: For building aerobic base.
    -   **Tempo Runs**: For improving speed and endurance.
    -   **Long Runs**: For increasing stamina.
    -   **Strength Training**: Upper and lower body workouts to prevent injury.
    -   **Rest & Recovery**: Essential days to let your body heal.
-   **Progress Tracking**:
    -   Interactive dashboard to view your weekly schedule.
    -   Check off completed workouts to track your discipline.
    -   Visual progress bar showing your overall plan completion.
-   **Week Locking Mechanism**: Focus on the present by keeping future weeks locked until you progress.
-   **Data Persistence**: All your data (plan, progress, user stats) is saved locally in your browser, so you never lose your spot.
-   **Responsive Design**: precise and usable on both desktop and mobile devices.

## How to Use

1. **Open the Application**: Simply open https://diysarj.github.io/meterun/ in any modern web browser.
2. **Onboarding**:
    - **Choose Goal**: Select your target distance (5K, 10K, or 15K).
    - **Experience Level**: Choose between Beginner or Intermediate.
    - **Recent Stats**: Enter your most recent run distance and time to help the algorithm calculate your starting point.
    - **Target Time**: Set a realistic goal for your target distance.
3. **Generate Plan**: Click "Generate Plan" to create your custom schedule.
4. **Train**:
    - View your dashboard to see the current week's workouts.
    - Click the checkbox next to each activity once completed.
    - Watch your progress bar grow!
5. **Reset**: If you need to start over, use the reset button in the header to clear your data and create a new plan.

## Technologies

-   **HTML5**: Semantic structure for accessibility and SEO.
-   **CSS3**: Custom vanilla CSS for styling.
-   **JavaScript**: Core logic for plan generation, state management, and DOM manipulation (no external frameworks required).
-   **LocalStorage API**: Used for saving user sessions client-side.

## Customization

You can modify the plan generation logic in `script.js` to tweak:

-   **Pace Calculations**: Adjust how target paces are derived from user inputs.
-   **Weekly Structure**: Change the types of workouts assigned to specific days.
-   **Plan Duration**: Modify the maximum number of weeks for generated plans.

## License

This project is open-source and available for modification.
