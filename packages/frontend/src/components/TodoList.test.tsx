import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContextProvider } from '../context/AppContext.js';
import { TodoList } from './TodoList.js';

// Mock the hooks used by TodoItem (since TodoList renders TodoItem)
vi.mock('../hooks/useToggleTodo.js', () => ({
  useToggleTodo: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('../hooks/useDeleteTodo.js', () => ({
  useDeleteTodo: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('../hooks/useUpdateDescription.js', () => ({
  useUpdateDescription: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

const mockTodos = [
  {
    id: 'todo-1',
    description: 'Buy groceries',
    completed: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'todo-2',
    description: 'Walk the dog',
    completed: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>{ui}</AppContextProvider>
    </QueryClientProvider>,
  );
}

describe('TodoList', () => {
  it('renders TodoItem for each todo', () => {
    renderWithProviders(<TodoList todos={mockTodos} total={2} />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Walk the dog')).toBeInTheDocument();
  });

  it('renders the list with correct role and label', () => {
    renderWithProviders(<TodoList todos={mockTodos} total={2} />);
    expect(screen.getByRole('list', { name: /todo list/i })).toBeInTheDocument();
  });

  it('renders EmptyState when todos=[] and total=0', () => {
    renderWithProviders(<TodoList todos={[]} total={0} />);
    expect(screen.getByRole('heading', { name: /no todos yet/i })).toBeInTheDocument();
    expect(screen.getByText(/add your first todo using the form above/i)).toBeInTheDocument();
  });

  it('does NOT render EmptyState when todos=[] but total > 0', () => {
    renderWithProviders(<TodoList todos={[]} total={5} />);
    // Should not show empty state message (this is an empty page, not empty DB)
    expect(screen.queryByText(/no todos yet/i)).not.toBeInTheDocument();
    // Should still render the list container
    expect(screen.getByRole('list', { name: /todo list/i })).toBeInTheDocument();
  });
});
