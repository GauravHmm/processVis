"""Entry point for the Process Creation and State Transition Visualizer."""

import sys
import os

# Ensure project root is on sys.path so imports work
sys.path.insert(0, os.path.dirname(__file__))

from gui.dashboard import Dashboard


def main() -> None:
    app = Dashboard()
    app.mainloop()


if __name__ == "__main__":
    main()
