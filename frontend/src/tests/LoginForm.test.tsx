import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import '@testing-library/jest-dom';
import LoginForm from '../components/Auth/LoginForm';
import { ToastContext } from '../components/Notifications/ToastNotification';
import { AuthContext } from '../contexts/AuthContext';

const mockLogin = vi.fn();
const mockShowToast = vi.fn();

function renderLoginForm() {
  return render(
    <AuthContext.Provider value={{ user: null, loading: false, login: mockLogin, register: vi.fn(), logout: vi.fn() }}>
      <ToastContext.Provider value={{ showToast: mockShowToast }}>
        <LoginForm />
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    renderLoginForm();
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('calls login on submit', async () => {
    renderLoginForm();
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
    fireEvent.submit(screen.getByRole('button', { name: /log in/i }));
    expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123');
  });
});
