# Contributing to Signal SDK

Thank you for your interest in contributing to Signal SDK! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md) to foster an open and welcoming environment.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
   ```bash
   git clone https://github.com/benoitpetit/signal-sdk.git
   cd signal-sdk
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Create a branch** for your feature or bugfix
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

1. **Make your changes** and ensure they follow the project's coding style
2. **Write tests** for your changes
3. **Run tests** to ensure everything works
   ```bash
   npm test
   ```
4. **Build the project** to verify your changes compile correctly
   ```bash
   npm run build
   ```
5. **Commit your changes** with clear, descriptive commit messages
   ```bash
   git commit -m "Add feature: your feature description"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request** from your fork to the main repository

## Pull Request Guidelines

- **One feature per pull request** - If you want to do more than one thing, send multiple pull requests
- **Add tests** for any new features or bug fixes
- **Document new code** with comments and update documentation if necessary
- **Follow the existing code style** - Use the same coding conventions as the rest of the project
- **Include a clear description** of what your PR does in the description

## Testing

We use Jest for testing. Please ensure your code passes all tests:

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testNamePattern="SignalCli"

# Run with coverage
npm run test:coverage
```

## Documentation

If your changes require documentation updates:

1. Update relevant markdown files in the `docs/` directory
2. If adding new features, include code examples showing how to use them
3. Ensure your documentation follows the same style as existing documentation

## Code Style

This project uses TypeScript and follows these style guidelines:

- Use 2 spaces for indentation
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Add appropriate JSDoc comments for public APIs
- Follow the existing patterns in the codebase

## Reporting Bugs

If you find a bug, please report it by creating an issue on GitHub:

1. Check if the bug has already been reported
2. Use the bug report template
3. Include detailed steps to reproduce the bug
4. Include any relevant logs or error messages
5. Describe the expected behavior and what actually happened

## Feature Requests

We welcome feature requests! Please submit them as GitHub issues:

1. Check if the feature has already been requested or implemented
2. Use the feature request template
3. Provide a clear description of the feature and its benefits
4. If possible, outline how the feature might be implemented

## Questions?

If you have any questions about contributing, please:

- Open an issue with your question
- Reach out on our [GitHub Discussions](https://github.com/signal-sdk/signal-sdk/discussions)

## License

By contributing to Signal SDK, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE). 