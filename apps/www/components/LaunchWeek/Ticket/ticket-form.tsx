import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
// import { scrollTo } from '@lib/smooth-scroll';
import cn from 'classnames'
// import GithubIcon from '~/components/LaunchWeek/Ticket/icons/icon-github'
// import CheckIcon from '~/components/LaunchWeek/Ticket/icons/icon-check'
import { SITE_ORIGIN } from '~/lib/constants'
import useConfData from '~/components/LaunchWeek/Ticket//hooks/use-conf-data'
import LoadingDots from './loading-dots'
import formStyles from './form.module.css'
import ticketFormStyles from './ticket-form.module.css'

type FormState = 'default' | 'loading' | 'error'
type TicketGenerationState = 'default' | 'loading'

type Props = {
  defaultUsername?: string
  setTicketGenerationState: React.Dispatch<React.SetStateAction<TicketGenerationState>>
}

export default function Form({ defaultUsername = '', setTicketGenerationState }: Props) {
  const [username, setUsername] = useState(defaultUsername)
  const [formState, setFormState] = useState<FormState>('default')
  const [errorMsg] = useState('')
  const { supabase, session, setUserData, setPageState, userData } = useConfData()
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (session?.user && !userData.id) {
      document.body.classList.add('ticket-generated')
      const username = session.user.user_metadata.user_name
      setUsername(username)
      const name = session.user.user_metadata.full_name
      const email = session.user.email
      supabase
        .from('lw7_tickets')
        .insert({ email, name, username, referred_by: router.query?.referral ?? null })
        .eq('email', email)
        .select()
        .single()
        .then(async ({ error }) => {
          // If error because of duplicate email, ignore and proceed, otherwise sign out.
          if (error && error?.code !== '23505') return supabase.auth.signOut()
          const { data } = await supabase
            .from('lw7_tickets_golden')
            .select('*')
            .eq('username', username)
            .single()
          setUserData(data)
          setFormState('default')

          // Prefetch GitHub avatar
          new Image().src = `https://github.com/${username}.png`

          // Prefetch the twitter share URL to eagerly generate the page
          fetch(`/launch-week/tickets/${username}`).catch((_) => {})
          // Prefetch ticket og image.
          fetch(
            `https://obuldanrptloktxcffvn.functions.supabase.co/lw7-ticket-og?username=${encodeURIComponent(
              username ?? ''
            )}`
          ).catch((_) => {})

          setPageState('ticket')
        })
    }
  }, [session])

  return formState === 'error' ? (
    <div>
      <div className={cn(formStyles['form-row'], ticketFormStyles['form-row'])}>
        <div className={cn(formStyles['input-label'], formStyles.error)}>
          <div className={cn(formStyles.input, formStyles['input-text'])}>{errorMsg}</div>
          <button
            type="button"
            className={cn(formStyles.submit, formStyles.error)}
            onClick={() => {
              setFormState('default')
              setTicketGenerationState('default')
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  ) : (
    <form
      ref={formRef}
      onSubmit={async (e) => {
        e.preventDefault()

        if (formState !== 'default') {
          setTicketGenerationState('default')
          setFormState('default')
          return
        }

        setFormState('loading')
        setTicketGenerationState('loading')

        await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: `${SITE_ORIGIN}/launch-week/tickets${
              userData.username ? '?referral=' + userData.username : ''
            }`,
          },
        })
      }}
      className="flex flex-col items-center xl:block"
    >
      <div className="flex flex-col gap-3">
        <div>
          <button
            type="submit"
            className="rounded-full bg-scale-400 py-1 px-3 border border-scale-500 dark:text-white text-sm mb-1 transition-all ease-out hover:bg-scale-500"
            disabled={formState === 'loading' || Boolean(session)}
          >
            <span className={`${username && 'text-scale-900'}`}>
              {session ? 'Done!' : 'Connect with GitHub'}
            </span>
            {session ? <span className={ticketFormStyles.checkIcon}></span> : null}
          </button>
        </div>
        {!session && <p className={'text-xs text-scale-900'}>Only public info will be used.</p>}
      </div>
    </form>
  )
}
