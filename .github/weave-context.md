# Project Context: Weave (Intelligent Visual Studio for Deep Learning)

## Project Metadata
* **Project Name**: Weave: Intelligent Visual Studio for Deep Learning.
* **Institution**: Kafr Elsheikh University, Faculty of Engineering, Intelligent Systems Department.
* **Date**: September 2025.
* **Team Members**: Ahmed Mahmoud Dawoud, Ahmed Mohamed Elmahalwey, Mahmoud Ahmed Elsheikh (MI), Omar Ossama Elzarka, and Sara Essam Eldein Ahmed.
* **Supervisor**: Dr. Heba Gamal.

## Project Overview
You are assisting with "Weave," a graduation project for Kafr Elsheikh University. Weave is a hybrid, visual Integrated Development Environment (IDE) that allows users to design, prototype, and train Deep Learning models using a drag-and-drop node-based canvas. It bridges the gap between visual architecture diagrams and executable PyTorch code.

## Core Architecture & Tech Stack
Weave uses a Hybrid Microservice Architecture separating the web platform from the deep learning execution environment.

* **Frontend (Browser-based Visual Editor)**
    * Framework: React with TypeScript.
    * Visual Node Engine: React Flow (must handle 1000+ nodes smoothly).
    * UI Components: Shadcn UI & Tailwind CSS.
* **Backend Orchestrator (API & Real-time)**
    * Framework: ASP.NET Core (.NET 8) with C#.
    * Database: SQL Server (via Entity Framework Core).
    * Real-Time Comms: SignalR (crucial for streaming training metrics with <500ms latency).
* **Execution Engine (Local Deep Learning)**
    * Language/Framework: Python and PyTorch.
    * Execution: Runs as a managed subprocess orchestrated by the .NET backend to leverage local GPU resources.
* **Deployment**
    * Containerization: Docker (Docker Compose).
    * Cloud: Azure.

## Key System Workflows & Constraints
When generating or reviewing code for this project, adhere to the following strict requirements:

1.  **Shape Inference Engine:** Tensor dimension calculations (B, C, H, W) must be calculated in real-time (<200ms latency) as nodes are connected in the UI to proactively prevent `RuntimeError: mat1 and mat2 shapes cannot be multiplied`.
2.  **PyTorch Code Generation:** The system automatically translates visual graphs into executable Python scripts. Any generated Python code must be 100% PEP8-compliant, pass all linting checks, and use native PyTorch without vendor lock-in.
3.  **Real-Time Feedback Loop:** Python stdout/stderr logs and training metrics (loss/accuracy) must stream back to the React frontend via the C# SignalR hub instantaneously. 
4.  **Interprocess Communication (IPC):** Communication between the C# backend and Python subprocess uses structured JSON. RabbitMQ is the fallback for IPC failures.

## Coding Guidelines for Copilot
* **TypeScript/React:** Favor functional components, strict typing, and hooks. Ensure UI components are accessible (WCAG 2.1 AA) and responsive.
* **C#/.NET:** Use modern C# features, asynchronous programming (`async/await`), and dependency injection. 
* **Python:** Prioritize clean, standard PyTorch implementations. Avoid boilerplate where possible, but ensure data loaders, training loops, and device management (CPU/GPU) are explicitly handled in the transpiled code.
* **Error Handling:** Provide robust error handling, especially for Python subprocess crashes, GPU memory exhaustion, and SignalR connection drops (implement exponential backoff).