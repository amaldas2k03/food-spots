import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { haversineMeters } from '../utils/geo.js';

const prisma = new PrismaClient();

// Seed spots are clustered around central Bengaluru so radius/near-me search
// returns sensible results out of the box. Swap these for your own city.
const CITY = { lat: 12.9716, lng: 77.5946 };

const photo = (id) => `https://images.unsplash.com/photo-${id}?w=800&q=80`;

const SPOTS = [
  {
    name: 'Copper Pot Kitchen',
    lat: 12.9719, lng: 77.6412, address: '12 Indiranagar 100ft Rd, Bengaluru',
    cuisineType: ['South Indian', 'Vegetarian'], priceRange: 2,
    dietaryTags: ['Vegetarian', 'Vegan'], photos: [photo('1585937421612-70a008356fbe')],
    dishes: [
      { name: 'Ghee Podi Dosa', description: 'Crisp dosa with roasted lentil spice and ghee' },
      { name: 'Filter Coffee', description: 'Chicory blend, served in a steel tumbler' },
      { name: 'Bisi Bele Bath', description: 'Rice, lentils and vegetables with kara masala' },
    ],
  },
  {
    name: 'Smoke & Char',
    lat: 12.9352, lng: 77.6245, address: '48 Koramangala 5th Block, Bengaluru',
    cuisineType: ['Barbecue', 'American'], priceRange: 3,
    dietaryTags: [], photos: [photo('1544025162-d76694265947')],
    dishes: [
      { name: 'Brisket Plate', description: '14-hour smoked, served with pickles and slaw' },
      { name: 'Burnt Ends', description: 'Caramelised brisket points in house sauce' },
    ],
  },
  {
    name: 'Noor Halal Grill',
    lat: 12.9698, lng: 77.6008, address: '5 Mosque Rd, Frazer Town, Bengaluru',
    cuisineType: ['Mughlai', 'North Indian'], priceRange: 2,
    dietaryTags: ['Halal'], photos: [photo('1601050690597-df0568f70950')],
    dishes: [
      { name: 'Mutton Biryani', description: 'Dum-cooked with long grain rice' },
      { name: 'Seekh Kebab', description: 'Charcoal grilled, mint chutney on the side' },
    ],
  },
  {
    name: 'The Green Fork',
    lat: 12.9784, lng: 77.5905, address: '22 Church St, Bengaluru',
    cuisineType: ['Continental', 'Healthy'], priceRange: 3,
    dietaryTags: ['Vegan', 'Gluten-Free', 'Vegetarian'], photos: [photo('1512621776951-a57141f2eefd')],
    dishes: [
      { name: 'Buddha Bowl', description: 'Quinoa, roast pumpkin, tahini' },
      { name: 'Beetroot Hummus Toast', description: 'On gluten-free sourdough' },
    ],
  },
  {
    name: 'Ramen Yokocho',
    lat: 12.9611, lng: 77.6387, address: '3 Domlur Layout, Bengaluru',
    cuisineType: ['Japanese', 'Ramen'], priceRange: 3,
    dietaryTags: [], photos: [photo('1557872943-16a5ac26437e')],
    dishes: [
      { name: 'Tonkotsu Ramen', description: '18-hour pork bone broth' },
      { name: 'Gyoza', description: 'Pan-fried pork and cabbage dumplings' },
    ],
  },
  {
    name: 'Anna Idli Stand',
    lat: 12.9542, lng: 77.5731, address: 'Gandhi Bazaar, Basavanagudi, Bengaluru',
    cuisineType: ['South Indian', 'Street Food'], priceRange: 1,
    dietaryTags: ['Vegetarian'], photos: [photo('1589301760014-d929f3979dbc')],
    dishes: [
      { name: 'Butter Idli', description: 'Steamed, drowned in ghee and podi' },
      { name: 'Vada Sambar', description: 'Crisp outside, fluffy inside' },
    ],
  },
  {
    name: 'Trattoria Bianca',
    lat: 12.9698, lng: 77.7499, address: '80 Whitefield Main Rd, Bengaluru',
    cuisineType: ['Italian'], priceRange: 4,
    dietaryTags: ['Vegetarian'], photos: [photo('1555396273-367ea4eb4db5')],
    dishes: [
      { name: 'Cacio e Pepe', description: 'Pecorino, black pepper, nothing else' },
      { name: 'Margherita', description: 'Wood-fired, 60-hour fermented dough' },
    ],
  },
  {
    name: 'Taco Cartel',
    lat: 12.9279, lng: 77.6271, address: '17 Jyoti Nivas College Rd, Bengaluru',
    cuisineType: ['Mexican', 'Street Food'], priceRange: 2,
    dietaryTags: ['Vegetarian', 'Gluten-Free'], photos: [photo('1565299624946-b28f40a0ae38')],
    dishes: [
      { name: 'Al Pastor Taco', description: 'Pineapple, pork shoulder, corn tortilla' },
      { name: 'Elote', description: 'Grilled corn, cotija, chilli lime' },
    ],
  },
  {
    name: 'Dumpling Alley',
    lat: 12.9833, lng: 77.6094, address: '9 Commercial St, Bengaluru',
    cuisineType: ['Chinese', 'Tibetan'], priceRange: 1,
    dietaryTags: ['Vegetarian'], photos: [photo('1563245372-f21724e3856d')],
    dishes: [
      { name: 'Steamed Chicken Momo', description: 'Ten to a plate with fiery chutney' },
      { name: 'Chilli Paneer', description: 'Indo-Chinese staple' },
    ],
  },
  {
    name: 'Brew & Bean',
    lat: 12.9755, lng: 77.6068, address: '31 Lavelle Rd, Bengaluru',
    cuisineType: ['Cafe', 'Bakery'], priceRange: 2,
    dietaryTags: ['Vegetarian', 'Gluten-Free'], photos: [photo('1501339847302-ac426a4a7cbb')],
    dishes: [
      { name: 'Cold Brew', description: '18-hour steep, single origin Chikmagalur' },
      { name: 'Almond Croissant', description: 'Laminated in-house' },
    ],
  },
];

const USERS = [
  { name: 'Aditi Rao', email: 'aditi@foodspots.dev', tasteProfile: ['South Indian', 'Cafe'] },
  { name: 'Marcus Feld', email: 'marcus@foodspots.dev', tasteProfile: ['Barbecue', 'American'] },
  { name: 'Priya Nair', email: 'priya@foodspots.dev', tasteProfile: ['Vegan', 'Healthy'] },
  { name: 'Sameer Khan', email: 'sameer@foodspots.dev', tasteProfile: ['Mughlai', 'Street Food'] },
  { name: 'Lena Ortiz', email: 'lena@foodspots.dev', tasteProfile: ['Mexican', 'Italian'] },
  { name: 'Ravi Menon', email: 'ravi@foodspots.dev', tasteProfile: ['Japanese', 'Chinese'] },
];

const REVIEW_TEXTS = [
  'Went twice in one week. The portions are honest and the service never drags.',
  'Solid but not spectacular — the sides carried the meal more than the mains did.',
  'Best thing I have eaten in this neighbourhood all year. Get there before the queue starts.',
  'Great flavours, but it was loud enough that we gave up on conversation halfway through.',
  'Consistent every single visit. That counts for more than a one-off great meal.',
  'Slightly overpriced for what it is, though the quality of the ingredients is obvious.',
  'Staff let us sit well past closing. Food was warm, generous, exactly what we wanted.',
  'Would come back for the one dish alone. The rest of the menu is forgettable.',
];

async function main() {
  console.log('Clearing existing data...');
  // Order matters: children before parents.
  await prisma.$transaction([
    prisma.dishRating.deleteMany(),
    prisma.reviewVote.deleteMany(),
    prisma.ownerResponse.deleteMany(),
    prisma.review.deleteMany(),
    prisma.listSpot.deleteMany(),
    prisma.curatedList.deleteMany(),
    prisma.crawlStop.deleteMany(),
    prisma.foodCrawl.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.dish.deleteMany(),
    prisma.spot.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('password123', 12);
  const users = await Promise.all(
    USERS.map((u, i) =>
      prisma.user.create({
        data: {
          ...u,
          passwordHash,
          avatarUrl: `https://i.pravatar.cc/150?img=${i + 11}`,
        },
      }),
    ),
  );

  console.log('Creating spots and dishes...');
  const spots = [];
  for (const [i, s] of SPOTS.entries()) {
    const { dishes, ...spotData } = s;
    const spot = await prisma.spot.create({
      data: {
        ...spotData,
        // Give two spots an owner so the owner-response flow is exercisable.
        ownerUserId: i < 2 ? users[i].id : null,
        hours: {
          mon: { open: '08:00', close: '22:00' }, tue: { open: '08:00', close: '22:00' },
          wed: { open: '08:00', close: '22:00' }, thu: { open: '08:00', close: '22:00' },
          fri: { open: '08:00', close: '23:00' }, sat: { open: '09:00', close: '23:00' },
          sun: { open: '09:00', close: '21:00' },
        },
        dishes: { create: dishes },
      },
      include: { dishes: true },
    });
    spots.push(spot);
  }

  console.log('Creating reviews...');
  let textIndex = 0;
  for (const [spotIndex, spot] of spots.entries()) {
    // Vary review volume so trending and hidden-gems produce different sets.
    const reviewerCount = spotIndex < 3 ? 5 : spotIndex < 6 ? 3 : 2;

    for (let r = 0; r < reviewerCount; r++) {
      const user = users[(spotIndex + r) % users.length];
      if (user.id === spot.ownerUserId) continue; // owners don't review themselves

      // Hidden gems need avg >= 4.5 with < 20 reviews; later spots skew high.
      const rating = spotIndex >= 6 ? 5 : 3 + ((spotIndex + r) % 3);
      const verified = (spotIndex + r) % 3 === 0;
      const daysAgo = spotIndex < 3 ? r : 10 + r * 3; // recent reviews drive trending

      await prisma.review.create({
        data: {
          userId: user.id,
          spotId: spot.id,
          overallRating: rating,
          text: REVIEW_TEXTS[textIndex++ % REVIEW_TEXTS.length],
          verifiedVisit: verified,
          helpfulCount: (spotIndex * 3 + r) % 12,
          photos: r === 0 ? spot.photos : [],
          createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          dishRatings: {
            create: spot.dishes.slice(0, 2).map((d) => ({
              dishId: d.id,
              rating: Math.max(1, Math.min(5, rating + ((r % 2) - 1))),
            })),
          },
        },
      });
    }
  }

  console.log('Recomputing aggregates...');
  for (const spot of spots) {
    const agg = await prisma.review.aggregate({
      where: { spotId: spot.id },
      _avg: { overallRating: true },
      _count: true,
    });
    await prisma.spot.update({
      where: { id: spot.id },
      data: {
        overallRating: Number((agg._avg.overallRating ?? 0).toFixed(2)),
        reviewCount: agg._count,
      },
    });

    for (const dish of spot.dishes) {
      const d = await prisma.dishRating.aggregate({ where: { dishId: dish.id }, _avg: { rating: true } });
      await prisma.dish.update({
        where: { id: dish.id },
        data: { avgRating: Number((d._avg.rating ?? 0).toFixed(2)) },
      });
    }
  }

  console.log('Creating lists, crawls, follows...');
  const list1 = await prisma.curatedList.create({
    data: {
      userId: users[0].id,
      title: 'Sunday Breakfast Run',
      description: 'Where I take visiting friends before noon.',
      spots: { create: [{ spotId: spots[0].id }, { spotId: spots[5].id }, { spotId: spots[9].id }] },
    },
  });
  const list2 = await prisma.curatedList.create({
    data: {
      userId: users[2].id,
      title: 'Actually Good Vegan Food',
      description: 'No sad salads on this list.',
      spots: { create: [{ spotId: spots[3].id }, { spotId: spots[0].id }, { spotId: spots[7].id }] },
    },
  });
  await prisma.curatedList.create({
    data: {
      userId: users[1].id,
      title: 'Meat Sweats Tour',
      description: 'Private for now — still testing these.',
      isPublic: false,
      spots: { create: [{ spotId: spots[1].id }, { spotId: spots[2].id }] },
    },
  });

  // A crawl with distance/ETA precomputed from straight-line distance, so the
  // planner has data to show before the Directions API is configured.
  const crawlSpots = [spots[9], spots[3], spots[8]];
  const straightLine = crawlSpots.slice(1).reduce(
    (sum, s, i) => sum + haversineMeters(crawlSpots[i].lat, crawlSpots[i].lng, s.lat, s.lng),
    0,
  );
  const crawl = await prisma.foodCrawl.create({
    data: {
      userId: users[0].id,
      title: 'Central Coffee to Dumplings',
      totalDistance: Math.round(straightLine),
      totalEta: Math.round((straightLine / 1000 / 20) * 3600), // ~20km/h city driving
      stops: { create: crawlSpots.map((s, i) => ({ spotId: s.id, position: i })) },
    },
  });

  // Everyone follows user[0]; user[0] follows a few back so their feed is populated.
  await prisma.follow.createMany({
    data: [
      ...users.slice(1).map((u) => ({ followerId: u.id, followingId: users[0].id })),
      { followerId: users[0].id, followingId: users[1].id },
      { followerId: users[0].id, followingId: users[2].id },
      { followerId: users[0].id, followingId: users[3].id },
    ],
    skipDuplicates: true,
  });

  console.log('Creating activity feed and notifications...');
  const recentReviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    take: 12,
    include: { spot: { select: { id: true, name: true } } },
  });
  await prisma.activity.createMany({
    data: recentReviews.map((r) => ({
      userId: r.userId,
      type: 'review_created',
      payload: { spotId: r.spotId, spotName: r.spot.name, reviewId: r.id },
      createdAt: r.createdAt,
    })),
  });
  await prisma.activity.createMany({
    data: [
      { userId: users[0].id, type: 'list_created', payload: { listId: list1.id, title: list1.title } },
      { userId: users[2].id, type: 'list_created', payload: { listId: list2.id, title: list2.title } },
      { userId: users[0].id, type: 'crawl_created', payload: { crawlId: crawl.id, title: crawl.title } },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: users[0].id, type: 'new_follower', payload: { userId: users[3].id, name: users[3].name } },
      { userId: users[0].id, type: 'review_helpful', payload: { fromUser: users[1].name } },
      { userId: users[0].id, type: 'review_on_your_spot', payload: { spotName: spots[0].name, fromUser: users[4].name }, read: true },
    ],
  });

  console.log('Awarding points and badges...');
  for (const user of users) {
    const [reviewCount, verifiedCount, listCount, crawlCount, helpful] = await Promise.all([
      prisma.review.count({ where: { userId: user.id } }),
      prisma.review.count({ where: { userId: user.id, verifiedVisit: true } }),
      prisma.curatedList.count({ where: { userId: user.id } }),
      prisma.foodCrawl.count({ where: { userId: user.id } }),
      prisma.review.aggregate({ where: { userId: user.id }, _sum: { helpfulCount: true } }),
    ]);

    const points =
      reviewCount * 1 +
      verifiedCount * 1 + // verified bonus on top of the base review point
      listCount * 5 +
      crawlCount * 3 +
      (helpful._sum.helpfulCount ?? 0);

    const badges = [];
    if (reviewCount >= 1) badges.push('First Bite');
    if (reviewCount >= 10) badges.push('Regular');
    if (verifiedCount >= 5) badges.push('Verified Explorer');
    if (listCount >= 3) badges.push('Curator');
    if (points >= 100) badges.push('Local Legend');

    await prisma.user.update({ where: { id: user.id }, data: { points, badges } });
  }

  const counts = {
    users: await prisma.user.count(),
    spots: await prisma.spot.count(),
    dishes: await prisma.dish.count(),
    reviews: await prisma.review.count(),
    lists: await prisma.curatedList.count(),
  };
  console.log('\nSeed complete:', counts);
  console.log(`City centre: ${CITY.lat}, ${CITY.lng}`);
  console.log('Sign in with any seeded email, password: password123');
  console.log(`e.g. ${USERS[0].email} / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
