export type AuthLevel = 'invite_only' | 'can_see_availability'

export type TimeBlock = 'early_morning' | 'brunch' | 'afternoon' | 'dinner' | 'late_night'
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

// availability[day][block] = true (free) | false (busy) | undefined (unknown)
export type WeekAvailability = Partial<Record<DayIndex, Partial<Record<TimeBlock, boolean>>>>

export type FriendshipStatus = 'pending' | 'accepted'

export type RSVPStatus = 'going' | 'maybe'

export type HangoutStatus = 'open' | 'closed' | 'cancelled'

export interface User {
  id: string
  email: string
  name: string
  nickname: string
  avatar_emoji: string
  created_at: string
}

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: FriendshipStatus
  auth_level: AuthLevel
  created_at: string
  friend?: User
}

export interface HangoutPost {
  id: string
  creator_id: string
  title: string
  description?: string
  activity?: string
  location?: string
  date_time: string
  max_people: number
  status: HangoutStatus
  is_surprise: boolean
  surprise_options?: string[]
  created_at: string
  creator?: User
  rsvps?: RSVP[]
}

export interface RSVP {
  id: string
  hangout_id: string
  user_id: string
  status: RSVPStatus
  created_at: string
  user?: User
}

export interface Poll {
  id: string
  hangout_id: string
  options: PollOption[]
  created_at: string
}

export interface PollOption {
  id: string
  poll_id: string
  text: string
  votes: number
  voted?: boolean
}

export interface Notification {
  id: string
  user_id: string
  type: 'hangout_invite' | 'rsvp_update' | 'reminder' | 'friend_request' | 'poll_created'
  data: Record<string, unknown>
  read: boolean
  created_at: string
}
