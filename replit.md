# Zombie Typing Game

## Overview

This is a full-stack web application that combines a 3D zombie survival game with typing practice. Players must type words correctly to shoot zombies in a first-person perspective 3D environment. The game features progressive difficulty, weapon upgrades, and comprehensive typing statistics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the main UI framework
- **Three.js** via @react-three/fiber for 3D graphics and game rendering
- **@react-three/drei** for additional 3D utilities and helpers
- **Zustand** for state management with subscribeWithSelector middleware
- **Radix UI** components for accessible UI elements
- **Tailwind CSS** for styling with custom design system
- **Vite** for development server and build tooling

### Backend Architecture
- **Express.js** server with TypeScript
- **In-memory storage** implementation for development (MemStorage class)
- **Modular route system** with placeholder for game-related APIs
- **Development-focused setup** with hot reloading via Vite integration

### Database Layer
- **Drizzle ORM** configured for PostgreSQL
- **Neon Database** serverless PostgreSQL for production
- **User schema** defined with username/password authentication
- **Migration system** for database schema management

## Key Components

### Game Engine
- **3D Environment**: Three.js-based zombie survival game with physics and photorealistic models
- **Typing System**: Real-time word generation and input processing
- **Weapon System**: Progressive weapon upgrades based on performance
- **Audio System**: Sound effects and background music with mute controls
- **Game Loop**: Frame-based updates for zombie movement and collision detection
- **Visual Effects**: Explosive death animations and particle systems for AAA-quality gameplay

### State Management
- **useZombieGame**: Main game state including zombies, weapons, stats
- **useAudio**: Audio playback and mute controls
- **useGame**: High-level game phase management (ready/playing/ended)

### UI Components
- **3D Game Canvas**: Main game viewport with camera controls
- **HUD Overlay**: Lives, score, WPM, accuracy display
- **Typing Interface**: Word display and input capture
- **Game Controls**: Restart, mute, and settings

### Backend Services
- **Storage Interface**: Abstracted CRUD operations for users
- **Route Registration**: Express middleware setup
- **Development Server**: Vite integration for hot reloading

## Data Flow

1. **Game Initialization**: Load audio assets, initialize 3D scene, start game loop
2. **Zombie Spawning**: Periodic creation of zombies with random words
3. **Input Processing**: Keyboard events trigger typing validation and shooting
4. **Collision Detection**: Check if zombies reach player boundaries
5. **Score Calculation**: Track WPM, accuracy, streak, and weapon progression
6. **State Updates**: Zustand stores manage all game state transitions

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Three.js utility library
- **@tanstack/react-query**: Server state management
- **express**: Web application framework
- **drizzle-orm**: TypeScript ORM for SQL databases

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type checking and compilation
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production builds

### Audio & Assets
- **GLSL shader support**: For advanced 3D effects
- **3D Model Assets**: High-quality photorealistic zombie models (zombie_01.glb, zombie_02.glb, zombie_03.glb)
- **Particle Systems**: Explosive death effects and weapon impact particles
- **Asset pipeline**: Support for 3D models (.gltf, .glb) and audio files
- **Font loading**: Inter font family integration

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: ESBuild bundles server to `dist/index.js`
3. **Database Migration**: Drizzle pushes schema changes to production DB

### Environment Configuration
- **DATABASE_URL**: Required for PostgreSQL connection
- **NODE_ENV**: Production environment flag
- **Static Assets**: Served from built frontend directory

### Production Setup
- **Single deployment**: Full-stack app with Express serving both API and static files
- **Database**: Neon serverless PostgreSQL with connection pooling
- **Asset Serving**: Express static middleware for game assets and fonts

### Development Workflow
- **Hot Reloading**: Vite dev server with Express integration
- **Type Checking**: TSX for server development with instant feedback
- **Database**: Local development with Drizzle migrations