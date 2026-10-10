export class PortfolioService {
  getSummary() {
    return {
      profile: {
        name: 'Safika Sultana',
        title: 'Data Analyst / Developer',
        location: 'Dhaka, Bangladesh',
        bio: 'Data analyst and developer focused on clear decision systems and polished product experiences.'
      },
      metrics: {
        projects: 28,
        yearsExperience: 6,
        dashboards: 12,
        stakeholderSatisfaction: '92%'
      },
      highlights: ['SQL', 'Dashboard design', 'Product analytics', 'Leadership reporting']
    };
  }
}
