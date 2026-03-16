import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionRenderer } from '@/components/survey/QuestionRenderer'
import type { Question } from '@/types/survey'

const mockOnAnswerChange = jest.fn()
const mockOnFollowUpChange = jest.fn()

function renderQuestion(question: Partial<Question> & { id: string; text: string; type: Question['type'] }) {
  const q: Question = {
    options: [],
    followUpLabel: null,
    ...question,
  }
  return render(
    <QuestionRenderer
      question={q}
      answer=""
      followUp=""
      onAnswerChange={mockOnAnswerChange}
      onFollowUpChange={mockOnFollowUpChange}
    />
  )
}

describe('QuestionRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the question text', () => {
    renderQuestion({ id: 'q1', text: 'How are you?', type: 'text-options', options: ['Good', 'Bad'] })
    // The text appears in both the <p> and the sr-only <legend>
    expect(screen.getAllByText('How are you?').length).toBeGreaterThan(0)
  })

  it('renders PercentageScale for percentage type', () => {
    renderQuestion({ id: 'q1', text: 'Rate it', type: 'percentage' })
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('renders TextOptions for text-options type', () => {
    renderQuestion({ id: 'q1', text: 'Choose', type: 'text-options', options: ['Yes', 'No', 'Maybe'] })
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('Maybe')).toBeInTheDocument()
  })

  it('renders OpenAnswer for open-answer type', () => {
    renderQuestion({ id: 'q1', text: 'Explain', type: 'open-answer' })
    expect(screen.getByPlaceholderText(/share your thoughts/i)).toBeInTheDocument()
  })

  it('renders FollowUp when followUpLabel is set', () => {
    renderQuestion({
      id: 'q1', text: 'Rate it', type: 'percentage',
      followUpLabel: 'Why did you choose this?'
    })
    expect(screen.getByText('Why did you choose this?')).toBeInTheDocument()
  })

  it('does not render FollowUp when followUpLabel is null', () => {
    renderQuestion({ id: 'q1', text: 'Rate it', type: 'percentage', followUpLabel: null })
    expect(screen.queryByLabelText(/why/i)).not.toBeInTheDocument()
  })

  it('calls onAnswerChange when a text option is selected', async () => {
    const user = userEvent.setup()
    renderQuestion({ id: 'q1', text: 'Choose', type: 'text-options', options: ['Yes', 'No'] })

    await user.click(screen.getByText('Yes'))
    expect(mockOnAnswerChange).toHaveBeenCalledWith('q1', 'Yes')
  })

  it('calls onAnswerChange when a percentage option is selected', async () => {
    const user = userEvent.setup()
    renderQuestion({ id: 'q1', text: 'Rate', type: 'percentage' })

    await user.click(screen.getByText('50%'))
    expect(mockOnAnswerChange).toHaveBeenCalledWith('q1', '50%')
  })

  it('calls onAnswerChange when open-answer text is entered', async () => {
    const user = userEvent.setup()
    renderQuestion({ id: 'q1', text: 'Explain', type: 'open-answer' })

    await user.type(screen.getByPlaceholderText(/share your thoughts/i), 'Hello')
    expect(mockOnAnswerChange).toHaveBeenCalled()
  })
})
