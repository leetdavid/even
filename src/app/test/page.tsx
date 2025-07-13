import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Even - Protected Test Page</h1>
        
        <SignedOut>
          <div className="text-center">
            <p className="mb-4 text-gray-600">Please sign in to access this page.</p>
            <SignInButton mode="modal">
              <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Sign In
              </button>
            </SignInButton>
          </div>
        </SignedOut>
        
        <SignedIn>
          <div className="text-center">
            <p className="mb-4 text-green-600">Welcome! You are successfully authenticated.</p>
            <div className="flex justify-center mb-4">
              <UserButton afterSignOutUrl="/" />
            </div>
            <p className="text-sm text-gray-500">This is a protected page that can only be accessed when logged in.</p>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}