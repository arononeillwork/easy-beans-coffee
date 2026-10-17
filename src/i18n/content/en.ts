import type { AllergenId, DrinkId } from '../allergens';

/**
 * English site copy. Visual-first: short lines only — imagery carries the
 * site. `en` is the canonical shape; `es.ts` must mirror it exactly.
 * No prices here, ever — prices come from the live Square catalog.
 *
 * Which allergens apply to which drink is *not* here: that lives in
 * `../allergens.ts`, shared by both locales. Only the labels are translated.
 */
export const en = {
  meta: {
    title: 'Easy Beans Coffee · San Pedro de Alcántara',
    description:
      'Specialty coffee, matcha and healthy drinks at Calle Pizarro 8, San Pedro de Alcántara. Order ahead, collect at the counter.',
  },
  nav: {
    menu: 'Menu',
    order: 'Order',
    shop: 'Shop',
    story: 'About',
    findUs: 'Visit',
    orderCta: 'Order for collection',
    account: 'Account',
  },
  /** Shared controls for the autoplaying films, used by every video slot. */
  media: {
    play: 'Play',
    pause: 'Pause',
  },
  /** The launch bar above the header. Opens the same subscribe modal as the popup. */
  hero: {
    headline: 'Canned in front of you.',
    /** The headline as it is set: one phrase per line. */
    lines: ['Canned', 'in front', 'of you.'],
    sub: 'Specialty coffee, matcha and ube on Calle Pizarro, San Pedro de Alcántara.',
    ctaOrder: 'Order for collection',
    ctaFind: 'Get directions',
    /** Names the hero film for screen readers. */
    filmLabel: 'An Easy Beans drink being made, from powder to sealed can',
  },
  /** The live line under the hero, built from the Google Maps hours and rating. */
  status: {
    openUntil: 'Open until {time}',
    opensAt: 'Closed. We open {when}',
    rating: '{rating} on Google',
  },
  /** Homepage menu board: photos from the site, prices live from Square. */
  board: {
    title: 'The menu',
    all: 'See the full menu',
    from: 'from',
  },
  story: {
    title: 'About us',
    headline: 'Two Irish lads, one small room on Calle Pizarro.',
    body: 'Irish-owned specialty café in San Pedro de Alcántara.',
    paragraphs: [
      'We opened in April 2026 with one fixed idea: every coffee, matcha and ube comes out the same, every time.',
      'The espresso is dialled in every morning, the matcha is whisked to order and the ube is cooked here.',
    ],
    photoAlt: 'The Easy Beans terrace on Calle Pizarro',
  },
  can: {
    line: 'Any cold drink, sealed in a can at the counter.',
    alt: 'An iced latte in an Easy Beans can, held on the terrace',
  },
  /** Names for the allergen table on the menu page. */
  education: {
    items: [
      { id: 'coffee', name: 'Coffee' },
      { id: 'matcha', name: 'Matcha' },
      { id: 'ube', name: 'Ube' },
      { id: 'acai', name: 'Açaí' },
      { id: 'chai', name: 'Chai' },
    ] as { id: DrinkId; name: string }[],
  },
  allergens: {
    title: 'Allergens',
    contains: 'Contains',
    none: 'No listed allergens',
    labels: {
      gluten: 'Gluten',
      milk: 'Milk',
      egg: 'Egg',
      nuts: 'Nuts',
      soy: 'Soy',
    } as Record<AllergenId, string>,
    note: 'Standard serve. Oat, soy and lactose-free milk are always available. The full allergen list is at the counter.',
  },
  social: {
    handle: '@easy.beans.coffee',
    tiktokHandle: '@easybeanscoffee',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    viewPost: 'Open the post',
    /** Alt text for our own photos, shown until Instagram is connected. */
    captions: ['Strawberry matcha, sealed', 'Açaí bowl', 'Ube latte', 'On the terrace'],
  },
  reviews: {
    count: 'reviews on Google',
    read: 'Read reviews',
    write: 'Write a review',
  },
  location: {
    label: 'Collection point',
    title: 'Calle Pizarro 8',
    town: '29670 San Pedro de Alcántara',
    address: 'C. Pizarro 8, 29670 San Pedro de Alcántara, Málaga',
    directions: 'Get directions',
    whatsapp: 'WhatsApp',
    amenities: 'Terrace, wifi, dogs welcome.',
    photoAlt: 'The Easy Beans terrace on Calle Pizarro',
  },
  shop: {
    eyebrow: 'The shop',
    headline: 'Take it home.',
    body: 'Coffee beans, matcha and chai. Order online, collect at Calle Pizarro 8.',
    collectNote: 'Collect at the counter, Calle Pizarro 8. No shipping yet.',
    comingSoon: 'Beans, matcha and chai to take home are coming soon.',
    menuCta: 'See the menu',
    categories: {
      beans: {
        name: 'Coffee beans',
        tagline: 'One bean, two roasts',
        blurb: 'Both Brazilian, both Mogiana — one roasted by hand in Dublin, one here in Málaga.',
      },
      matchaChai: {
        name: 'Matcha & chai',
        tagline: 'Whisked and brewed, not mixed',
        blurb: 'Ceremonial grade matcha, and the chai blend we brew in-house.',
      },
      bundles: {
        name: 'Gift sets',
        tagline: 'Both roasts, one box',
        blurb: 'Put together for people who cannot decide, and for people buying for someone else.',
      },
    },
    badges: {
      new: 'New',
      limited: 'Limited edition',
      pick: "Barista's pick",
    },
    card: {
      add: 'Add to cart',
      adding: 'Adding…',
      added: 'Added',
      soldOut: 'Sold out',
      from: 'From',
      save: 'Save',
      was: 'Was',
    },
    product: {
      grind: 'Grind',
      size: 'Size',
      quantity: 'Quantity',
      add: 'Add to cart',
      description: 'Description',
      sourcing: 'Sourcing',
      brewing: 'How to brew',
      collection: 'Collection',
      related: 'Goes well with',
      back: 'Back to the shop',
    },
    all: 'Shop all',
    featured: 'What we would take home',
    placeholderNotice:
      'Preview only — these are sample products. Real stock and prices appear here as soon as they are added to Square, and ordering switches on then.',
    empty: 'Nothing in this collection yet.',
    unavailable: 'The shop is loading — or catching its breath. Try again shortly.',
    faqTitle: 'Questions',
    faq: [
      {
        q: 'How do I get my order?',
        a: 'Collect it at the counter, C. Pizarro 8. You will get a text when it is ready. We do not ship yet.',
      },
      {
        q: 'Which roast should I buy?',
        a: 'The dark Dublin roast is deeper and rounder — it is our espresso base. The light Málaga roast is brighter and sweeter, and what we use for filter and iced coffee.',
      },
      {
        q: 'Whole bean or ground?',
        a: 'Whole bean keeps far longer. If you would rather we grind it, tell us what you brew on and we will set it right.',
      },
      {
        q: 'How long do the beans stay good?',
        a: 'Best within a month of the roast date on the bag. Keep them sealed, dry and out of the sun — not in the freezer.',
      },
      {
        q: 'Is the matcha really ceremonial grade?',
        a: 'Yes — stone-ground, and the same tin we whisk from behind the counter.',
      },
    ],
  },
  newsletter: {
    headline: 'Events and tastings',
    body: 'One email when something is on.',
    emailLabel: 'Email',
    placeholder: 'you@example.com',
    cta: 'Sign up',
    done: 'You are on the list.',
  },
  popup: {
    headline: 'Subscribe to our newsletter',
    body: '10% off our online shop for 6 months when you join.',
    interestsLabel: 'I want to hear about',
    /** Pill labels — two words max so they sit on one line. Keys mirror `INTEREST_KEYS`. */
    interests: {
      coffee: 'Coffee tips',
      spanish: 'Learning Spanish',
      english: 'Learning English',
      menu: 'Menu updates',
      events: 'Events',
      offers: 'Offers',
    },
    emailLabel: 'Your email',
    phoneLabel: 'Phone (optional)',
    cta: 'Subscribe',
    dismiss: 'No thanks',
    close: 'Close',
    done: 'You are on the list.',
    invalidEmail: 'Enter a valid email.',
    invalidPhone: 'Enter a valid phone number, or leave it empty.',
    codeLabel: 'Your code',
    codeNote: 'Emailed to you as well. Good for 10% off online orders for 6 months.',
  },
  /** The /account page: Supabase Auth sign-in, then the customer's own details. */
  account: {
    /**
     * The allergies preference. Chosen from the same five allergens as the
     * counter sign; kept on the device, never sent to a server — the copy
     * says so, and safety stays a conversation at the counter.
     */
    allergies: 'Allergies',
    allergiesBody: 'Pick yours from the list and the site will remember them on this device.',
    allergiesLabel: 'Choose from the list',
    allergiesNote:
      'Saved on this device only. Always tell us at the counter as well — the full allergen list lives there.',
    title: 'Account',
    eyebrow: 'Your account',
    signInHeadline: 'Sign in',
    signInBody: 'Your details, interests and rewards — the same as at the counter.',
    emailLabel: 'Your email',
    passwordLabel: 'Password',
    signIn: 'Sign in',
    signUpHeadline: 'Create your account',
    signUpBody: 'One account for your details, interests and rewards.',
    signUp: 'Create account',
    passwordHint: 'At least 8 characters.',
    google: 'Continue with Google',
    or: 'or',
    noAccount: 'New here? Create an account',
    haveAccount: 'Already have an account? Sign in',
    forgot: 'Forgot your password?',
    backToSignIn: 'Back to sign in',
    forgotHeadline: 'Reset your password',
    forgotBody: 'We email you a link to set a new one.',
    sendReset: 'Email me a reset link',
    resetSent: 'Check your inbox — the link is on its way.',
    resetHeadline: 'Set a new password',
    newPasswordLabel: 'New password',
    resetSave: 'Save password',
    resetDone: 'Password updated.',
    checkEmailHeadline: 'Confirm your email',
    checkEmailBody: 'We sent a confirmation link to {email}. Click it and you are in.',
    invalidEmail: 'Enter a valid email.',
    invalidPassword: 'At least 8 characters.',
    badCredentials: 'Wrong email or password.',
    emailNotConfirmed: 'Confirm your email first — the link is in your inbox.',
    accountExists: 'That email already has an account — sign in instead.',
    authFailed: 'Sign-in did not work just now. Try again.',
    unavailable: 'Accounts are not switched on yet. Back soon.',
    profileHeadline: 'Your details',
    profileBody: 'Stored with Square, our till and shop system. Yours to change or delete any time.',
    givenName: 'First name',
    familyName: 'Last name',
    emailField: 'Email',
    emailManaged: 'Your sign-in email. Ask us at the counter to change it.',
    phone: 'Phone',
    birthday: 'Birthday',
    addressLine1: 'Street address',
    addressLine2: 'Apartment, floor…',
    locality: 'Town or city',
    postalCode: 'Postcode',
    save: 'Save changes',
    saved: 'Saved.',
    invalidPhone: 'Enter a valid phone number, or leave it empty.',
    signOut: 'Sign out',
    /**
     * The rewards section. "Beans" is not hard-coded: the unit name comes
     * from the Square loyalty programme's own terminology, so the till and
     * the site always agree on what a point is called.
     */
    rewardsHeadline: 'Rewards',
    rewardsBody: 'Counted by Square — the same balance as at the counter.',
    rewardsLifetime: '{points} collected all-time',
    rewardsNone: 'None yet. Your first order at the counter starts the count.',
    rewardsReady: 'Ready to redeem',
    rewardsToGo: '{points} to go',
    rewardsRedeemNote: 'Redeem at the counter — just ask before you pay.',
    rewardsFailed: 'Could not load your rewards just now.',
    deleteHeadline: 'Delete account',
    deleteBody:
      'Removes your details and newsletter signup for good. Completed orders stay in the books — the tax office insists.',
    delete: 'Delete my account',
    deleteAsk: 'Are you sure? Your details and newsletter signup are removed for good — this cannot be undone.',
    deleteConfirm: 'Yes, delete everything',
    deleteKeep: 'Keep my account',
    deleted: 'All gone. You are signed out — see you at the counter.',
  },
  footer: {
    hoursTitle: 'Opening hours',
    /** Fallback only: the live hours come from Google Maps. */
    hours: [
      { label: 'Mon – Fri', value: '8:00 – 15:00' },
      { label: 'Saturday', value: '9:00 – 15:00' },
      { label: 'Sunday', value: 'Closed' },
    ],
    closed: 'Closed',
    allDay: 'Open 24 h',
    contactTitle: 'Contact',
    rights: '© 2026 Easy Beans Coffee',
  },
  menuPage: {
    eyebrow: 'The menu',
    headline: 'Made the same way, every time.',
    /**
     * The drink studio. One screen, one drink, every choice on it — see
     * features/menu for the model behind these labels.
     */
    studio: {
      eyebrow: 'What are we making?',
      groupLabel: 'Drinks or food',
      sectionLabel: 'Part of the menu',
      drinkLabel: 'Choose a drink',
      swipe: 'Swipe',
      tempLabel: 'Temperature',
      hot: 'Hot',
      iced: 'Iced',
      serveLabel: 'How you take it',
      sitIn: 'Sit in',
      takeaway: 'Takeaway',
      can: 'In a can',
      canNote: 'Poured into a can at the counter — same drink, same price.',
      pickLabel: 'Which one',
      none: 'None',
      prevDrink: 'Previous drink',
      nextDrink: 'Next drink',
      scrollBack: 'Scroll back',
      scrollAhead: 'Scroll for more',
      showMore: 'Show more',
      showLess: 'Show less',
      comingSoon: 'Coming soon',
      price: 'Price',
      ready: 'Ready in',
      readyMinutes: '{min} min',
      readyNow: 'Right away',
      priceUnknown: 'Ask at the counter',
      add: 'Add to order',
      added: 'Added',
      quantityLabel: 'How many',
      soldOut: 'Sold out today',
      stalePrices: 'Prices last checked {day}.',
      photoSoon: 'Photograph coming soon',
      /** Screen-reader only: names the shot without describing the drink twice. */
      photoAlt: '{drink}, {serve}',
    },
  },
  order: {
    title: 'Order for collection',
    subtitle: 'Pay online. Skip the queue. Collect at the counter.',
    cart: 'Your order',
    emptyCart: 'Nothing here yet.',
    add: 'Add',
    edit: 'Edit',
    remove: 'Remove',
    required: 'Required',
    optional: 'Optional',
    quantity: 'Quantity',
    checkout: 'Pay with Square',
    pickupTitle: 'Collection',
    pickupNow: 'Collect at the counter, today',
    pickupReadyIn: 'Ready in about {min} min',
    pickupReadyNow: 'Ready as soon as you arrive',
    nameLabel: 'Name for the order',
    emailLabel: 'Email (receipt)',
    noteLabel: 'Note for the counter',
    total: 'Total',
    subtotal: 'Subtotal',
    closedNow: 'Online orders are closed right now. We stop taking them {min} minutes before closing.',
    reopensAt: 'Online orders open again {when}.',
    itemCount: '{n} items',
    itemCountOne: '1 item',
    confirmedTitle: 'Order confirmed. Remember to collect your order at the counter.',
    confirmingPayment: 'We are confirming your payment…',
    readyTitle: 'Your order is ready. Please collect it at the counter.',
    statusLink: 'View order status',
    orderNumber: 'Order number',
    amountPaid: 'Amount paid',
    pickupTime: 'Estimated pickup',
    status: {
      awaiting_payment: 'Payment confirmation pending',
      confirmed: 'Order received',
      preparing: 'Your order is being prepared',
      ready: 'Your order is ready',
      collected: 'Order collected',
      cancelled: 'Order cancelled',
      failed: 'Payment failed',
    },
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    cartChanged: 'The menu changed while you were ordering. Please review your items.',
    closed: 'That time is outside our opening hours.',
  },
};

export type SiteContent = typeof en;
