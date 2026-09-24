import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { SignupForm } from './signup-form'

export default async function SignupPage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignupForm />
    </div>
  )
}
