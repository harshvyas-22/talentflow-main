# TalentFlow

TalentFlow is a modern recruiting and talent management application designed to streamline the hiring process. It provides a comprehensive suite of tools for managing candidates, jobs, and assessments in a single, intuitive interface.

![TalentFlow Dashboard](https://via.placeholder.com/800x400?text=TalentFlow+Dashboard)

## Features

### Candidate Management
- **Kanban Board**: Visualize and manage candidates through different stages of the hiring process
- **Candidate Cards**: View essential candidate information at a glance
- **Notes System**: Add and track notes for candidates with @mention functionality
- **Interview Scheduling**: Schedule and track candidate interviews
- **Timeline View**: See a chronological history of candidate interactions
- **Skills Tracking**: Track and filter candidates by their skillsets

### Job Management
- **Job Listings**: Create and manage job openings
- **Job Details**: Track applications and progress for each position
- **Filtering & Sorting**: Easily find the right jobs based on various criteria
- **Drag and Drop Reordering**: Prioritize job listings with intuitive drag and drop

### Assessment Builder
- **Custom Assessments**: Create tailored assessments for different positions
- **Question Editor**: Build various types of questions for your assessments
- **Assessment Preview**: Review how assessments will appear to candidates
- **Multiple Question Types**: Support for multiple-choice and free text responses

## Tech Stack

- **Frontend**: React with modern hooks and patterns
- **Build Tool**: Vite for fast development and optimized production builds
- **State Management**: React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS for responsive, utility-first styling
- **UI Components**: Custom component library with Lucide icons
- **Data Storage**: IndexedDB (via Dexie.js) for client-side persistence
- **API Mocking**: MSW (Mock Service Worker) for API simulation
- **Form Handling**: Controlled components with React state

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── assessments/ # Assessment-related components
│   ├── candidates/  # Candidate management components
│   ├── jobs/        # Job listing components
│   └── ui/          # Shared UI elements (buttons, cards, etc.)
├── data/          # Seed data and mock information
├── pages/         # Page components and routing
├── services/      # API calls, data fetching and business logic
└── main.jsx       # Application entry point
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/talentflow.git
   cd talentflow
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run lint` - Run ESLint to check for code issues
- `npm run preview` - Preview the production build locally

### Using the Application

- **Jobs**: Navigate to the Jobs tab to create and manage job listings
- **Candidates**: Use the Candidates tab to track applicants through the hiring process
- **Assessments**: Create custom assessments for evaluating candidates

### Working with Mock Data

TalentFlow uses MSW (Mock Service Worker) to simulate a backend API. All data is stored in the browser's IndexedDB, which persists between sessions. This allows you to:

- Test the full application workflow without a real backend
- Create, update, and delete data that persists between browser sessions
- Experience realistic network delays and error handling

To reset the data, you can clear your browser's IndexedDB storage through the developer tools.

## Contributing

We welcome contributions to TalentFlow! Please follow these steps to contribute:

1. Fork the repository
2. Create a new branch for your feature or bugfix
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes and commit them
   ```bash
   git commit -m "Add your meaningful commit message here"
   ```
4. Push your branch to your forked repository
   ```bash
   git push origin feature/your-feature-name
   ```
5. Submit a pull request describing your changes

### Development Guidelines

- Write clean, maintainable, and testable code
- Follow the existing code style and naming conventions
- Update documentation for any new features or API changes
- Add appropriate tests for new functionality

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [React](https://reactjs.org/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [Vite](https://vitejs.dev/) - Build tool
- [Mock Service Worker](https://mswjs.io/) - API mocking
- [Dexie.js](https://dexie.org/) - IndexedDB wrapper
- [Lucide Icons](https://lucide.dev/) - SVG icon library
- [React Query](https://tanstack.com/query/latest) - Data fetching library
- [React Router](https://reactrouter.com/) - Routing solution

## Browser Compatibility

TalentFlow is designed to work with modern browsers:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Future Enhancements

We're constantly working to improve TalentFlow. Some planned features include:

- Enhanced reporting and analytics
- Email integration for candidate communication
- Calendar integration for interview scheduling
- Mobile app for on-the-go recruiting
- Dark mode support

## Support

If you encounter any issues or have questions, please open an issue on GitHub or contact the development team.
