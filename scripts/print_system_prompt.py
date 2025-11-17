#!/usr/bin/env python3
"""
Script to print the system prompt for the current project using Serena's InitialInstructionsTool
"""

import sys
import os
from pathlib import Path

def main():
    """Main function to get and print the initial instructions for the project"""
    try:
        # Add current directory to Python path so we can import serena
        sys.path.insert(0, str(Path(__file__).parent.parent))

        # Import Serena components
        from serena.agent import SerenaAgent
        from serena.project import Project
        from serena.tools import InitialInstructionsTool

        # Get current directory (project path)
        project_path = Path.cwd()
        print(f"Project path: {project_path}", file=sys.stderr)

        # Create a Project instance
        project = Project(project_path)

        # Create a SerenaAgent instance
        agent = SerenaAgent()

        # Get the InitialInstructionsTool
        initial_instructions_tool = None
        for tool in agent.tools:
            if isinstance(tool, InitialInstructionsTool):
                initial_instructions_tool = tool
                break

        if initial_instructions_tool is None:
            print("Error: InitialInstructionsTool not found in agent tools", file=sys.stderr)
            return 1

        # Apply the tool to get the initial instructions
        result = initial_instructions_tool.apply(project_path=str(project_path))

        # Print the result
        if result:
            print(result)
            return 0
        else:
            print("No initial instructions found", file=sys.stderr)
            return 1

    except ImportError as e:
        print(f"Import error: {e}", file=sys.stderr)
        print("Make sure serena is installed and available", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())