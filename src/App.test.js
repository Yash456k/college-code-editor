import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the home page room join form', () => {
  render(<App />);
  expect(screen.getByText(/paste invitation room id/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/room id/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
});
