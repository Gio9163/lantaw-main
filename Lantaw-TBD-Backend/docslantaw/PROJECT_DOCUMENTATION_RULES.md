# Project Documentation Rules

This document outlines the rules and guidelines for creating documentation files (`.md`) for each folder in the Lantaw-TBD-Backend project.

## Purpose

Each markdown file in the `docs/` folder should provide a comprehensive explanation of a corresponding folder/directory in the project structure. The documentation helps developers understand the purpose, structure, and usage of each module or component.

## File Naming Convention

- Documentation files should be named after the folder they document, in lowercase
- Use hyphens (`-`) to separate words if needed
- File extension must be `.md`
- Example: `lantaw/projects/` → `docs/projects.md`

## Required Sections

Each documentation file MUST include the following sections in this order:

### 1. Overview
- **Purpose**: A clear, concise statement of what this folder/module does
- **Role in Project**: Explain how this module fits into the overall project architecture
- **Dependencies**: List key dependencies that this module/app requires to function. **Important**: Clearly distinguish between:
  - **Built-in Django**: Components that come with Django (e.g., `django.contrib.auth`, `django.contrib.admin`)
  - **Third-party packages**: External packages that must be installed separately (e.g., `djangorestframework`, `djangorestframework-simplejwt`)
  - **Other project modules**: Other apps/modules within this project that this module depends on
  
  Format example:
  ```markdown
  **Dependencies**:
  - **Built-in Django**: Component name (`package.path`)
  - **Third-party packages**: Package name (`package-name`)
  - **Project modules**: Other app/module names
  ```

### 2. Directory Structure
- Provide a visual tree structure of the folder (can be simplified, focusing on important files)
- Include brief descriptions for key files and subdirectories
- Format as a code block or bullet list

### 3. Key Components

#### 3.1 Models (for Django apps)
- List all models in the module
- For each model, provide:
  - Model name and purpose
  - Key fields (name, type, constraints)
  - Relationships with other models
  - Important methods or validations

#### 3.2 Views (for Django apps)
- List view classes/functions
- Explain the purpose of each view
- Mention authentication/permission requirements
- Note any special behaviors or business logic

#### 3.3 Serializers (for Django REST Framework apps)
- List serializer classes
- Explain what data they handle
- Note any custom validation or transformation logic

#### 3.4 URLs/API Endpoints
- List available endpoints
- For each endpoint, include:
  - HTTP method(s)
  - URL pattern
  - Purpose
  - Authentication requirements

#### 3.5 Management Commands (if applicable)
- List custom Django management commands
- Explain what each command does
- Provide usage examples

#### 3.6 Signals (if applicable)
- List custom signals
- Explain when they are triggered
- Describe their purpose

#### 3.7 Tests
- Describe the testing structure
- List test files and their coverage
- Note any important test fixtures or utilities

### 4. Configuration
- Important settings related to this module
- Environment variables used
- Any configuration files specific to this module

### 5. Usage Examples
- Provide practical examples of how to use the module
- Include code snippets where helpful
- Show common workflows or patterns

### 6. Important Notes
- Any special considerations or gotchas
- Best practices specific to this module
- Known limitations or future improvements

### 7. Related Documentation
- Links to related modules
- References to external documentation
- API documentation links (if applicable)

## Writing Guidelines

### Language and Tone
- Use clear, professional language
- Write in present tense
- Be concise but thorough
- Assume the reader has basic knowledge of Django/Python

### Code Examples
- Use proper code blocks with language tags (e.g., `python`, `bash`, `json`)
- Keep examples simple and focused
- Include comments where necessary
- Ensure all examples are accurate and tested

### Formatting
- Use proper Markdown syntax
- Use headers hierarchically (##, ###, ####)
- Use bullet points for lists
- Use tables for structured data comparisons
- Use code blocks for file paths, commands, and code snippets

### Detail Level
- Be thorough but not exhaustive
- Focus on concepts and architecture, not implementation minutiae
- Include enough detail for a developer to understand and work with the module
- Avoid repeating information that can be found in code comments

## Section Requirements by Folder Type

### Django Apps
Must include: Overview, Models, Views, Serializers, URLs, Tests, Usage Examples

### Core/Configuration Folders
Must include: Overview, Directory Structure, Key Files, Configuration, Usage Examples

### Utility/Helper Folders
Must include: Overview, Key Functions/Classes, Usage Examples, API Reference

### Management Commands Folders
Must include: Overview, Available Commands, Usage Examples, Parameters and Options

## Maintenance Guidelines

### When to Update Documentation
- When adding new models, views, or endpoints
- When changing core functionality
- When modifying API contracts
- When adding new dependencies or configurations
- During code reviews (documentation should be reviewed alongside code)

### Keeping Documentation Current
- Review documentation during refactoring
- Update examples when code changes
- Remove outdated information
- Keep related documentation links updated

## Quality Checklist

Before finalizing a documentation file, ensure:

- [ ] All required sections are included
- [ ] Code examples are accurate and tested
- [ ] Links work and are current
- [ ] Grammar and spelling are correct
- [ ] Formatting is consistent with other documentation
- [ ] Technical terms are explained or linked
- [ ] The documentation provides value to developers
- [ ] File follows naming conventions
- [ ] Directory structure is accurate

## Example Structure

Here's a minimal example of what a documentation file should look like:

```markdown
# [Folder Name] Documentation

## Overview

### Purpose
Brief description of what this folder contains and its purpose.

### Role in Project
How this module fits into the overall architecture.

### Dependencies
- **Built-in Django**: Component name (`package.path`)
- **Third-party packages**: Package name (`package-name`)
- **Project modules**: Other app/module names (if applicable)

## Directory Structure

```
folder/
├── models.py
├── views.py
├── serializers.py
└── ...
```

## Key Components

### Models
- **ModelName**: Description...

### Views
- **ViewName**: Description...

## Usage Examples

Example code here...

## Important Notes

Special considerations...

## Related Documentation

- [Link to related doc](link)
```

## Version History

When making significant updates to documentation, consider adding a version history section noting major changes and dates.

---

**Last Updated**: [Date]
**Maintained By**: Development Team

