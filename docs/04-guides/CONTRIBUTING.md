# Contributing to QURI Protocol

Thank you for your interest in contributing to QURI Protocol! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## Getting Started

1. **Fork the repository**
   ```bash
   # Clone your fork
   git clone https://github.com/YOUR_USERNAME/QURI-PROTOCOL.git
   cd QURI-PROTOCOL
   ```

2. **Set up upstream remote**
   ```bash
   git remote add upstream https://github.com/AndeLabs/QURI-PROTOCOL.git
   ```

3. **Install dependencies**
   ```bash
   make install-deps
   ```

## Development Setup

### Prerequisites

- Rust 1.75.0 or higher
- dfx 0.15.0 or higher (optional, for ICP development)
- Git

### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
rustup component add rustfmt clippy
```

### Install dfx (ICP SDK)

```bash
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
```

### Verify Installation

```bash
make verify-install
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications

### 2. Make Changes

- Write clear, concise code
- Follow Rust best practices
- Add tests for new functionality
- Update documentation as needed

### 3. Run Checks

Before committing, run:

```bash
make check  # Runs format, clippy, and tests
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add new Rune validation logic"
```

Commit message format:
```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### Rust Style

- Follow the [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `cargo fmt` for formatting
- Use `cargo clippy` for linting
- Maximum line length: 100 characters

### Code Quality

- **No warnings**: Code must compile without warnings
- **No unsafe code**: Unless absolutely necessary and well-documented
- **Comprehensive error handling**: Use Result types, avoid unwrap()
- **Documentation**: All public APIs must be documented

### Example

```rust
/// Validates a Rune name according to the Runes protocol specification.
///
/// # Arguments
///
/// * `name` - The Rune name to validate
///
/// # Returns
///
/// * `Ok(())` if valid
/// * `Err(QuriError)` if invalid
///
/// # Examples
///
/// ```
/// use quri_utils::validate_rune_name;
///
/// assert!(validate_rune_name("BITCOIN").is_ok());
/// assert!(validate_rune_name("invalid").is_err());
/// ```
pub fn validate_rune_name(name: &str) -> Result<(), QuriError> {
    // Implementation
}
```

### Naming Conventions

- **Variables**: `snake_case`
- **Functions**: `snake_case`
- **Types/Structs**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Modules**: `snake_case`

## Testing

### Unit Tests

```bash
make test-unit
```

Write tests in the same file as the code:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_rune_name() {
        assert!(validate_rune_name("BITCOIN").is_ok());
        assert!(validate_rune_name("").is_err());
    }
}
```

### Integration Tests

```bash
make test-integration
```

Place integration tests in `tests/` directory.

### Code Coverage

```bash
make coverage
```

Aim for >80% code coverage for new code.

## Pull Request Process

### Before Submitting

1. ✅ All tests pass (`make test`)
2. ✅ Code is formatted (`make fmt`)
3. ✅ No clippy warnings (`make clippy`)
4. ✅ Documentation is updated
5. ✅ CHANGELOG.md is updated (for significant changes)

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

How has this been tested?

## Checklist

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. At least one maintainer must approve
2. All CI checks must pass
3. No unresolved comments
4. Up-to-date with main branch

## Issue Reporting

### Bug Reports

Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Rust version, etc.)
- Relevant logs or error messages

### Feature Requests

Include:
- Clear description of the feature
- Use case and motivation
- Proposed implementation (optional)
- Alternatives considered

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed

## Project Structure

```
quri-protocol/
├── canisters/          # ICP Smart Contracts
│   ├── rune-engine/
│   ├── bitcoin-integration/
│   ├── registry/
│   └── identity-manager/
├── libs/               # Shared libraries
│   ├── quri-types/
│   ├── quri-utils/
│   ├── bitcoin-utils/
│   ├── runes-utils/
│   └── schnorr-signatures/
└── tools/              # Development tools
    ├── deployment/
    └── testing-suite/
```

## Communication

- **GitHub Issues**: Bug reports and feature requests
- **Pull Requests**: Code review and discussions
- **Discord**: Real-time chat (link in README)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue or reach out to the maintainers.

---

Thank you for contributing to QURI Protocol! 🎉
