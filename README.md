<div align="center">

# Neura - AI-Powered DeFi Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

## 🚀 Features

### Core Features
- **AI-Powered Trading** - Machine learning-driven trading strategies
- **Vault Management** - Automated yield optimization and risk management
- **Portfolio Analytics** - Real-time tracking and performance metrics
- **Secure Authentication** - Web3 wallet integration with Privy
- **Responsive Design** - Optimized for all devices

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Shadcn/ui
- **Web3**: Wagmi, Viem, Privy
- **State Management**: React Query, Context API
- **Testing**: Jest, React Testing Library

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Package Manager** (pnpm recommended)
  ```bash
  npm install -g pnpm
  ```
- **Git** (for version control)
- **Web3 Wallet** (MetaMask, Coinbase Wallet, etc.)

## 🛠️ Getting Started

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/operari-xyz/Neura-frontend.git
   cd Neura-frontend
   ```

2. **Install dependencies**
   ```bash
   # Using pnpm (recommended)
   pnpm install
   
   # Alternative: using npm
   npm install
   
   # Alternative: using yarn
   yarn install
   ```

3. **Environment Configuration**
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Update the `.env` file with your configuration:
     ```env
     # Required Environment Variables
     VITE_PRIVY_APP_ID=your_privy_app_id
     VITE_QUICKNODE_RPC_URL=your_quicknode_rpc_url
     
     # Optional Configuration
     VITE_ENVIRONMENT=development
     VITE_APP_VERSION=1.0.0
     ```

4. **Start Development Server**
   ```bash
   # Start development server
   pnpm run dev
   ```
   The application will be available at `http://localhost:8080`

5. **Building for Production**
   ```bash
   # Build for production
   pnpm run build
   
   # Preview production build
   pnpm run preview
   ```

## 🏗️ Architecture

### Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── ui/        # Shadcn/ui components
│   └── shared/    # Custom shared components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions and configurations
├── pages/         # Page components
├── styles/        # Global styles and theme
└── types/         # TypeScript type definitions
```

### Tech Stack Details

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with CSS Modules
- **State Management**:
  - React Query for server state
  - Context API for global state
  - Local state with React hooks
- **Web3**:
  - Wagmi for Ethereum interactions
  - Viem for type-safe Web3
  - Privy for authentication
- **UI Components**:
  - Shadcn/ui for accessible components
  - Radix UI primitives
  - Framer Motion for animations

## 🔌 Blockchain Integration

### Supported Networks

| Network | Type | Status  |
|---------|------|---------|
| Ethereum Mainnet | Production | ✅ Live |
| Arbitrum One | Production | ✅ Live |
| Optimism | Production | ✅ Live |
| Base | Beta | 🚧 Testing |

### Smart Contracts

| Contract | Description | Address |
|----------|-------------|---------|
| VaultFactory | Manages vault creation | `0x...` |
| AIAgent | Handles trading strategies | `0x...` |
| Whitelist | Manages access control | `0x...` |

### Wallet Support
- MetaMask
- Coinbase Wallet
- Rabby
- WalletConnect

## 🔐 Authentication & Wallet Connection

- Connection is wallet-driven using Wagmi connectors. The app gates content by wallet connection (`isConnected`).
- Use the `Connect Wallet` button in the Navbar to initiate a Wagmi `connect()` flow. External wallets (e.g., MetaMask, Rabby, Coinbase) are supported; embedded wallets and email/SSO are not.
- Disconnect using the `Disconnect` button in the Navbar, which calls Wagmi's `useDisconnect`.

## 🚀 Deployment

### Production Build

1. **Build the application**
   ```bash
   pnpm run build
   ```
   This will create an optimized production build in the `dist` directory.

### Deployment Options

#### Vercel (Recommended)
1. Push your code to a GitHub repository
2. Import the repository in Vercel
3. Configure environment variables
4. Deploy!

#### Self-Hosted
1. Set up a web server (Nginx/Apache)
2. Configure SSL (Let's Encrypt recommended)
3. Serve the `dist` directory
4. Set up proper caching headers

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_PRIVY_APP_ID` | Yes | Privy App ID for authentication |
| `VITE_QUICKNODE_RPC_URL` | Yes | QuickNode RPC endpoint |
| `VITE_ENVIRONMENT` | No | `production` or `development` |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ by the Operari team
- Special thanks to our beta testers and community

### Building for Production

```bash
pnpm run build
```

This creates optimized production files in the `dist` directory.

### Deployment Options

- **Static Hosting**: Deploy the `dist` directory to any static hosting service
- **Docker**: A Dockerfile is provided for containerized deployment
- **CI/CD**: Configure with GitHub Actions or similar for automated deployment

## 🧪 Testing

```bash
pnpm run test
```

The test suite includes unit tests and integration tests to ensure application reliability.

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the project's coding standards and includes appropriate tests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Neura Frontend** | Built with ❤️ for the DeFi community

</div>
