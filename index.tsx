import { Redirect } from 'expo-router';

// Root route — always redirect to login; login redirects to (tabs) on success.
export default function RootIndex() {
  return <Redirect href="/login" />;
}
