# TalentFlow

TalentFlow is a modern recruiting and talent management application designed to streamline the hiring process. It provides a comprehensive suite of tools for managing candidates, jobs, and assessments in a single, intuitive interface.

## Features

### Candidate Management
- **Kanban Board**: Visualize and manage candidates through different stages of the hiring process
- **Candidate Cards**: View essential candidate information at a glance
- **Notes System**: Add and track notes for candidates with @mention functionality
- **Interview Scheduling**: Schedule and track candidate interviews
- **Timeline View**: See a chronological history of candidate interactions

### Job Management
- **Job Listings**: Create and manage job openings
- **Job Details**: Track applications and progress for each position
- **Filtering & Sorting**: Easily find the right jobs based on various criteria

### Assessment Builder
- **Custom Assessments**: Create tailored assessments for different positions
- **Question Editor**: Build various types of questions for your assessments
- **Assessment Preview**: Review how assessments will appear to candidates

## Tech Stack

- **Frontend**: React with modern hooks and patterns
- **State Management**: React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS for responsive, utility-first styling
- **UI Components**: Custom component library with Lucide icons
- **Mock Backend**: MSW (Mock Service Worker) for API simulation
- **Form Handling**: Controlled components with React state

## Project Structure

```
src
├── components      # Shared components
├── features        # Feature-specific components and logic
├── pages           # Page components
├── services        # API calls and business logic
├── styles          # Global styles and theming
└── utils           # Utility functions and helpers
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open your browser and navigate to `http://localhost:3000`

## Contributing

We welcome contributions to TalentFlow! Please follow these steps to contribute:

1. Fork the repository
2. Create a new branch for your feature or bugfix
3. Make your changes and commit them
4. Push your branch to your forked repository
5. Submit a pull request describing your changes

Please ensure that your code adheres to the project's coding standards and includes appropriate tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
