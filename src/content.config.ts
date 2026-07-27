import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const common = {
  title: z.string().min(8),
  description: z.string().min(40).max(180),
  workshop: z.string().min(3),
  order: z.number().int().positive(),
  draft: z.boolean().default(false),
  updatedAt: z.coerce.date(),
};

const services = defineCollection({
  loader: glob({ base: './src/content/services', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    ...common,
    eyebrow: z.string(),
    seoTitle: z.string().min(20).max(65),
    intro: z.string().min(80),
    focus: z.array(z.string()).min(3),
    featuredProof: z.array(z.string()).min(1),
  }),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    ...common,
    route: z.string().startsWith('/'),
    status: z.enum(['Built', 'Pre-launch', 'In development']),
    role: z.string(),
    kind: z.enum(['Founder project', 'Native software', 'Automation', 'Technical experiment']),
    technologies: z.array(z.string()),
    publicRepository: z.url().optional(),
    featured: z.boolean().default(false),
    schemaType: z.enum(['SoftwareApplication']).optional(),
    operatingSystem: z.string().optional(),
  }),
});

const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().min(8),
    description: z.string().min(40).max(180),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    topics: z.array(z.string()).min(1),
    relatedProject: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().min(30),
    date: z.coerce.date(),
    status: z.enum(['Building', 'Learning', 'Maintaining']),
    order: z.number().int().positive(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles, notes, projects, services };
