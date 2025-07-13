import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function TestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">
          Even - Protected Test Page
        </h1>

        <SignedOut>
          <div className="text-center">
            <p className="mb-4 text-gray-600">
              Please sign in to access this page.
            </p>
            <SignInButton mode="modal">
              <button className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700">
                Sign In
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="text-center">
            <p className="mb-4 text-green-600">
              Welcome! You are successfully authenticated.
            </p>
            <div className="mb-4 flex justify-center">
              <UserButton afterSignOutUrl="/" />
            </div>
            <p className="text-sm text-gray-500">
              This is a protected page that can only be accessed when logged in.
            </p>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}
