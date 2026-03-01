/**
 * Parse courses and assignments from scraped page data.
 * Supports D2L/LEARN (learn.uwaterloo.ca) and generic LMS patterns.
 */

export interface ContextPage {
  url: string;
  title: string;
  text: string;
}

export interface Course {
  id: string;
  name: string;
  url?: string;
  sourceContextId?: string;
}

export interface Assignment {
  title: string;
  courseId?: string;
  courseName?: string;
  url?: string;
  dueDate?: string;
  description?: string;
  sourceContextId?: string;
}

/** Extract course ID from D2L URL (e.g. /d2l/home/12345) */
function extractCourseIdFromUrl(url: string): string | null {
  const match = url.match(/\/d2l\/home\/(\d+)/);
  return match ? match[1] : null;
}

/** Extract course name from page title (e.g. "CS 135 - Introduction - Dashboard" -> "CS 135 - Introduction") */
function extractCourseNameFromTitle(title: string): string | null {
  const t = title.trim();
  if (!t) return null;
  // Remove common suffixes: Dashboard, Home, Content, Assignments, etc.
  const suffix = /\s*[-–—|]\s*(Dashboard|Home|Content|Assignments|Dropbox|Grades|Discussions?|Quizzes?)$/i;
  const cleaned = t.replace(suffix, '').trim();
  return cleaned || t;
}

/** Check if URL looks like an assignment/dropbox page */
function isAssignmentUrl(url: string): boolean {
  return /\/dropbox\/|\/assignments?\/|assignment/i.test(url);
}

/** Try to extract due date from text (e.g. "Due: Feb 28, 2025" or "Due date: ...") */
function extractDueDate(text: string): string | undefined {
  const patterns = [
    /Due\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i,
    /Due\s*date\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i,
    /Due\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s*[-–—]?\s*(?:due|deadline)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].trim();
  }
  return undefined;
}

/** Extract assignment-like titles from page title or text */
function extractAssignmentTitle(page: ContextPage): string | null {
  const title = page.title.trim();
  const text = page.text.slice(0, 500);
  // Prefer page title if it looks like an assignment
  if (title && !/^(Dashboard|Home|Content|Grades|Discussions?)$/i.test(title)) {
    const cleaned = title.replace(/\s*[-–—|]\s*(Dropbox|Assignments?)$/i, '').trim();
    if (cleaned.length > 2) return cleaned;
  }
  // Fallback: first line of text that looks like a heading
  const firstLine = text.split('\n')[0]?.trim();
  if (firstLine && firstLine.length < 120) return firstLine;
  return title || null;
}

export function parseCoursesAndAssignments(
  pages: ContextPage[],
  sourceContextId?: string
): { courses: Course[]; assignments: Assignment[] } {
  const courseMap = new Map<string, Course>();
  const assignments: Assignment[] = [];

  for (const page of pages) {
    const { url, title, text } = page;
    const combined = `${title}\n${text}`;

    // Extract course from D2L home URL
    const courseId = extractCourseIdFromUrl(url);
    if (courseId) {
      const name = extractCourseNameFromTitle(title) || `Course ${courseId}`;
      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          id: courseId,
          name,
          url,
          sourceContextId,
        });
      } else {
        // Update name if we have a better one
        const existing = courseMap.get(courseId)!;
        if (name.length > existing.name.length || !existing.name.startsWith('Course ')) {
          existing.name = name;
          existing.url = url;
        }
      }
    }

    // Infer course from other D2L URLs (e.g. /d2l/le/content/12345/...)
    const contentMatch = url.match(/\/d2l\/le\/(?:content|dropbox)\/(\d+)/);
    const inferredCourseId = contentMatch ? contentMatch[1] : courseId;

    // Assignment pages
    if (isAssignmentUrl(url) || /assignment|dropbox|due\s*date|submit/i.test(combined)) {
      const assignTitle = extractAssignmentTitle(page);
      if (assignTitle) {
        const course = inferredCourseId ? courseMap.get(inferredCourseId) : undefined;
        assignments.push({
          title: assignTitle,
          courseId: inferredCourseId ?? undefined,
          courseName: course?.name,
          url,
          dueDate: extractDueDate(combined),
          description: text.slice(0, 300).trim() || undefined,
          sourceContextId,
        });
      }
    }
  }

  // Also add courses inferred from assignment courseIds
  for (const a of assignments) {
    if (a.courseId && !courseMap.has(a.courseId) && a.courseName) {
      courseMap.set(a.courseId, {
        id: a.courseId,
        name: a.courseName,
        url: undefined,
        sourceContextId,
      });
    }
  }

  return {
    courses: Array.from(courseMap.values()),
    assignments,
  };
}
