# RXN3D LMS (Laboratory Management System)

Welcome to the **RXN3D LMS**, a modern Laboratory Management System built using **Next.js** for dental laboratory operations. This comprehensive platform provides case management, 3D modeling, billing, and administrative tools for dental laboratories and offices.

## Description

The RXN3D LMS is a full-featured laboratory management system designed specifically for dental professionals. It includes:

- **Case Management**: Complete workflow for dental case processing
- **3D Modeling**: Interactive 3D tooth visualization and manipulation
- **Billing System**: Integrated billing and payment processing with Stripe
- **User Management**: Multi-role system (Lab Administrators, Office Administrators, Technicians)
- **Product Library**: Comprehensive dental product catalog
- **Analytics**: Business intelligence and reporting tools
- **HIPAA Compliance**: Built-in compliance features for healthcare data
- **Multi-language Support**: Internationalization support
- **Real-time Notifications**: Live updates and communication tools

## How to Run

### Prerequisites
- Node.js (version 18 or higher)
- npm or pnpm package manager

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://bullet18181@bitbucket.org/rxn3d/rxn3d_frontend.git
   cd rxn3d_frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory with your environment variables:
   ```env
   NEXT_PUBLIC_API_URL=your_api_url
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
   STRIPE_SECRET_KEY=your_stripe_secret
   # Add other required environment variables
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Access the Application**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

### Additional Scripts

- **Performance Analysis**: `npm run analyze`
- **GLB File Optimization**: `npm run optimize-glb`
- **Linting**: `npm run lint`

## How to Test

### Running Tests

The project uses Jest and React Testing Library for testing. To run tests:

```bash
npm test
# or
npm run test:watch
```

### Test Coverage

```bash
npm run test:coverage
```

### E2E Testing

For end-to-end testing, the project supports Playwright:

```bash
npm run test:e2e
```

### Manual Testing

1. **User Authentication**: Test login/logout functionality
2. **Case Management**: Create, edit, and process dental cases
3. **3D Model Interaction**: Test 3D tooth visualization and manipulation
4. **Billing Flow**: Test payment processing and billing features
5. **Role-based Access**: Verify permissions for different user types
6. **Responsive Design**: Test on various screen sizes and devices

### Performance Testing

```bash
npm run scan
```

This will start the development server and run performance analysis tools.

## Design System

The RXN3D platform follows a comprehensive design system for consistent UI/UX across all components. See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for full documentation.

**Key Features:**
- Floating label inputs with validation states
- Standardized color tokens and interaction states
- Accessible components following WCAG 2.1 AA
- Consistent hover, focus, and disabled states

**Quick Start:**
```tsx
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// Floating label input with validation
<Input
  label="Patient Name"
  value={value}
  validationState="valid"
  onChange={handleChange}
/>

// Design system button
<Button variant="success">Save</Button>
```

## Project Structure

```
├── app/                    # Next.js app directory
├── components/             # Reusable React components
│   ├── ui/                # Design system components
│   └── ...                # Feature components
├── contexts/              # React context providers
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and configurations
├── services/              # API service functions
├── stores/                # State management (Zustand)
├── types/                 # TypeScript type definitions
├── utils/                 # Helper utilities
└── public/                # Static assets
```

## Technologies Used

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **3D Graphics**: Three.js, React Three Fiber
- **State Management**: Zustand, Redux Toolkit
- **Forms**: React Hook Form with Zod validation
- **Payments**: Stripe
- **Internationalization**: i18next
- **Testing**: Jest, React Testing Library