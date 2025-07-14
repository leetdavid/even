import '@testing-library/jest-dom'
import { vi } from 'vitest'
import type React from 'react'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/app',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-id',
      primaryEmailAddress: {
        emailAddress: 'test@example.com',
      },
    },
    isLoaded: true,
    isSignedIn: true,
  }),
  SignedIn: ({ children }: { children: React.ReactNode }) => children,
  SignedOut: () => null,
  RedirectToSignIn: () => null,
  UserButton: () => null,
}))

// Mock tRPC
vi.mock('@/trpc/react', () => ({
  api: {
    useUtils: () => ({
      expense: {
        invalidate: vi.fn(),
      },
    }),
    expense: {
      getAll: {
        useQuery: vi.fn(() => ({ data: [], isLoading: false })),
      },
      getById: {
        useQuery: vi.fn(() => ({ data: null, isLoading: false })),
      },
      create: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
      update: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
      delete: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
      addComment: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
    },
    friends: {
      getFriends: {
        useQuery: vi.fn(() => ({ data: [], isLoading: false })),
      },
      getFriendRequests: {
        useQuery: vi.fn(() => ({ data: [], isLoading: false })),
      },
    },
    groups: {
      getUserGroups: {
        useQuery: vi.fn(() => ({ data: [], isLoading: false })),
      },
      getGroupDetails: {
        useQuery: vi.fn(() => ({ data: null, isLoading: false })),
      },
    },
  },
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))