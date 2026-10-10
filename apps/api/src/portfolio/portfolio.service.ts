import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PortfolioService {
  constructor(private readonly database: DatabaseService) {}
  async getSummary() {
    let metrics: { publishedProjects: number; publishedPosts: number } | null = null;
    let source = 'unconfigured';
    const db = this.database.getClient();
    if (db) {
      source = 'unavailable';
      try {
        const [projects, posts] = await Promise.all([
          db.from('portfolio_content_records').select('id', { count: 'exact', head: true }).eq('published', true).eq('section', 'projects'),
          db.from('portfolio_content_records').select('id', { count: 'exact', head: true }).eq('published', true).eq('section', 'posts')
        ]);
        if (!projects.error && !posts.error) { metrics = { publishedProjects: projects.count || 0, publishedPosts: posts.count || 0 }; source = 'database'; }
      } catch { /* Keep a truthful unavailable state. */ }
    }
    return {
      profile: {
        name: 'Safika Sultana',
        title: 'Data Scientist / Machine Learning Engineer / Data Analyst',
        location: 'Electronic City, Bengaluru',
        bio: 'Data analyst and developer focused on clear decision systems and polished product experiences.'
      },
      metrics,
      source,
      highlights: ['SQL', 'Dashboard design', 'Product analytics', 'Leadership reporting']
    };
  }
}
