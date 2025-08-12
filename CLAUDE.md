# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered elderly fitness assessment application with MediaPipe integration for pose detection. The system implements standardized fitness tests for elderly users (60+) with real-time movement tracking and performance evaluation.

## Development Commands

### Setup and Installation
```bash
# Install all dependencies (backend + frontend)
npm run install:all

# Install separately
npm run install:backend
npm run install:frontend
```

### Development
```bash
# Run backend development server (port 3000)
npm run dev:backend

# Run frontend development server (Vite)
npm run dev:frontend

# Build frontend for production
npm run build:frontend
```

### Database Operations
```bash
# Run database migrations
npm run db:migrate

# Seed database with initial data
npm run db:seed
```

### Testing
```bash
# Run backend tests (Jest)
cd backend && npm test

# Run frontend linting
cd frontend && npm run lint
```

### Deployment
```bash
# Deploy to Google Cloud Platform
npm run deploy:gcp
```

## Architecture

### Tech Stack
- **Backend**: Node.js/Express with PostgreSQL, JWT authentication, helmet security
- **Frontend**: React 18 with Vite, TailwindCSS, MediaPipe for pose detection
- **Database**: PostgreSQL with structured schema for users, test sessions, and results

### Key Components

#### Backend Structure (`/backend`)
- **API Routes**: `/api/auth`, `/api/users`, `/api/tests`, `/api/reports`, `/api/health`
- **Security**: Rate limiting, CORS, helmet, input validation with express-validator
- **Database**: Connection pooling with pg-pool, migrations in `/backend/migrations`
- **Services**: Scoring service for test evaluation, test service for session management

#### Frontend Structure (`/frontend`)
- **Pages**: Authentication (Login/Register), Dashboard, TestPage, Results, Profile
- **Contexts**: AuthContext for user management, TestContext for test sessions
- **Hooks**: `useMediaPipe` for pose detection, `useChairStandDetection` for movement analysis
- **Components**: TestCamera with MediaPipe integration for real-time pose tracking

### Database Schema
- **users**: User profiles with physical metrics (height, weight, BMI calculation)
- **test_types**: 7 standardized elderly fitness tests (chair stand, arm curl, etc.)
- **test_sessions**: Track testing sessions with status management
- **test_results**: Store scores with performance levels and percentile rankings
- **user_health_metrics**: Calculated BMI, age, fitness levels, fall risk assessment

### Test Types Implemented
1. Chair Stand Test (椅子坐立) - 30 seconds, lower body strength
2. Arm Curl Test (肱二頭肌手臂屈舉) - 30 seconds, upper body strength
3. Back Scratch Test (抓背測驗) - Upper body flexibility
4. Sit and Reach Test (椅子坐姿體前彎) - Lower body flexibility
5. 8-Foot Up and Go (8英呎起身繞行) - Agility and dynamic balance
6. Step in Place (原地站立抬膝) - 2 minutes, cardiovascular endurance

## MediaPipe Integration

The application uses MediaPipe Pose for real-time movement detection:
- Camera access through `TestCamera` component
- Pose landmark detection for movement analysis
- Chair stand detection algorithm in `useChairStandDetection` hook
- Real-time rep counting and performance feedback

## API Authentication

JWT-based authentication with:
- Token generation on login/register
- Protected routes requiring Bearer token
- User context maintained through AuthContext

## Environment Variables

Required in `.env`:
- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT signing
- `NODE_ENV`: development/production

## Performance Scoring

Age and gender-specific scoring tables for test evaluation:
- Age groups: 60-64, 65-69, 70-74, 75-79, 80-84, 85-89, 90+
- Performance levels: excellent, good, average, fair, poor
- Percentile rankings within demographic groups