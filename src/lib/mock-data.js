import { User, HangoutPost, Friendship, RSVP, WeekAvailability } from '@/types'

export const mockCurrentUser: User = {
  id: 'user-1',
  email: 'you@example.com',
  name: 'Alex Chen',
  nickname: 'alex',
  avatar_emoji: '🦊',
  created_at: new Date().toISOString(),
}

export const mockFriends: User[] = [
  { id: 'user-2', email: 'jamie@example.com', name: 'Jamie Park', nickname: 'jamie', avatar_emoji: '🐸', created_at: '' },
  { id: 'user-3', email: 'sam@example.com', name: 'Sam Rivera', nickname: 'sam', avatar_emoji: '🦋', created_at: '' },
  { id: 'user-4', email: 'taylor@example.com', name: 'Taylor Kim', nickname: 'tay', avatar_emoji: '🐻', created_at: '' },
  { id: 'user-5', email: 'morgan@example.com', name: 'Morgan Lee', nickname: 'morg', avatar_emoji: '🦅', created_at: '' },
]

// availability[dayIndex 0=Mon][block] = true(free) | false(busy) | undefined(unknown)
export const mockAvailability: Record<string, WeekAvailability> = {
  'user-1': {
    0: { early_morning: false, brunch: true,  afternoon: true,  dinner: true,  late_night: false },
    1: { early_morning: false, brunch: false, afternoon: true,  dinner: false, late_night: true  },
    2: { early_morning: true,  brunch: true,  afternoon: false, dinner: true,  late_night: false },
    3: { early_morning: false, brunch: true,  afternoon: true,  dinner: true,  late_night: false },
    4: { early_morning: false, brunch: true,  afternoon: true,  dinner: true,  late_night: true  },
    5: { early_morning: true,  brunch: true,  afternoon: true,  dinner: false, late_night: false },
    6: { early_morning: false, brunch: false, afternoon: true,  dinner: true,  late_night: true  },
  },
  'user-2': {
    0: { early_morning: false, brunch: true,  afternoon: true,  dinner: true,  late_night: false },
    1: { early_morning: false, brunch: false, afternoon: false, dinner: true,  late_night: true  },
    2: { early_morning: true,  brunch: true,  afternoon: false, dinner: false, late_night: false },
    3: { early_morning: false, brunch: true,  afternoon: true,  dinner: false, late_night: false },
    4: { early_morning: false, brunch: false, afternoon: true,  dinner: true,  late_night: true  },
    5: { early_morning: true,  brunch: true,  afternoon: true,  dinner: true,  late_night: true  },
    6: { early_morning: true,  brunch: true,  afternoon: false, dinner: false, late_night: false },
  },
  'user-3': {
    0: { early_morning: true,  brunch: false, afternoon: true,  dinner: false, late_night: false },
    1: { early_morning: true,  brunch: true,  afternoon: false, dinner: true,  late_night: false },
    2: { early_morning: false, brunch: true,  afternoon: true,  dinner: true,  late_night: false },
    3: { early_morning: false, brunch: false, afternoon: false, dinner: false, late_night: true  },
    4: { early_morning: true,  brunch: true,  afternoon: true,  dinner: false, late_night: false },
    5: { early_morning: false, brunch: true,  afternoon: true,  dinner: true,  late_night: true  },
    6: { early_morning: false, brunch: false, afternoon: true,  dinner: true,  late_night: true  },
  },
  'user-4': {
    0: { early_morning: false, brunch: true,  afternoon: false, dinner: true,  late_night: true  },
    1: { early_morning: false, brunch: false, afternoon: true,  dinner: true,  late_night: false },
    2: { early_morning: false, brunch: true,  afternoon: true,  dinner: false, late_night: false },
    3: { early_morning: true,  brunch: true,  afternoon: false, dinner: true,  late_night: false },
    4: { early_morning: false, brunch: false, afternoon: false, dinner: false, late_night: true  },
    5: { early_morning: true,  brunch: true,  afternoon: true,  dinner: true,  late_night: false },
    6: { early_morning: true,  brunch: false, afternoon: true,  dinner: true,  late_night: true  },
  },
  'user-5': {
    0: { early_morning: false, brunch: false, afternoon: true,  dinner: true,  late_night: false },
    1: { early_morning: false, brunch: true,  afternoon: true,  dinner: false, late_night: false },
    2: { early_morning: true,  brunch: false, afternoon: false, dinner: true,  late_night: true  },
    3: { early_morning: false, brunch: true,  afternoon: false, dinner: true,  late_night: false },
    4: { early_morning: true,  brunch: true,  afternoon: true,  dinner: true,  late_night: false },
    5: { early_morning: false, brunch: true,  afternoon: true,  dinner: false, late_night: true  },
    6: { early_morning: false, brunch: false, afternoon: false, dinner: true,  late_night: true  },
  },
}

export const mockFriendships: Friendship[] = mockFriends.map((f, i) => ({
  id: `fs-${i}`,
  user_id: 'user-1',
  friend_id: f.id,
  status: 'accepted',
  auth_level: i % 2 === 0 ? 'can_see_availability' : 'invite_only',
  created_at: '',
  friend: f,
}))

const now = new Date()
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
const inTwoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000)

export const mockHangouts: HangoutPost[] = [
  {
    id: 'hang-1',
    creator_id: 'user-1',
    title: 'Monday Cafe Crawl ☕',
    description: 'Trying that new place on Elm St — anyone down?',
    activity: 'Coffee & Chill',
    location: 'Bloom Coffee, 12 Elm St',
    date_time: new Date(tomorrow.setHours(14, 0, 0, 0)).toISOString(),
    max_people: 3,
    status: 'open',
    is_surprise: false,
    created_at: now.toISOString(),
    creator: mockCurrentUser,
    rsvps: [
      { id: 'r1', hangout_id: 'hang-1', user_id: 'user-2', status: 'going', created_at: '', user: mockFriends[0] },
      { id: 'r2', hangout_id: 'hang-1', user_id: 'user-3', status: 'maybe', created_at: '', user: mockFriends[1] },
    ],
  },
  {
    id: 'hang-2',
    creator_id: 'user-2',
    title: 'Surprise adventure 🎲',
    description: 'I have something fun planned, trust the process',
    date_time: new Date(inTwoDays.setHours(16, 0, 0, 0)).toISOString(),
    max_people: 2,
    status: 'open',
    is_surprise: true,
    surprise_options: ['Bowling alley', 'Escape room', 'Rooftop bar', 'Vintage arcade'],
    created_at: now.toISOString(),
    creator: mockFriends[0],
    rsvps: [
      { id: 'r3', hangout_id: 'hang-2', user_id: 'user-4', status: 'going', created_at: '', user: mockFriends[2] },
    ],
  },
  {
    id: 'hang-3',
    creator_id: 'user-3',
    title: 'Dinner TBD 🍜',
    description: 'Hungry, need crew. Location up for debate.',
    date_time: new Date(inTwoDays.setHours(19, 30, 0, 0)).toISOString(),
    max_people: 5,
    status: 'open',
    is_surprise: false,
    created_at: now.toISOString(),
    creator: mockFriends[1],
    rsvps: [],
  },
]
