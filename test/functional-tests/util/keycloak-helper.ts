import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';

export interface ProfileData {
  firstName: string;
  lastName: string;
}

export class KeycloakHelper {
  private cookieJar: CookieJar;

  constructor() {
    this.cookieJar = new CookieJar();
  }

  private extractFormAction(html: string): string | null {
    const $ = cheerio.load(html);
    const formAction = $('form').attr('action');
    return formAction?.replace(/&amp;/g, '&') || null;
  }

  private hasPasswordField(html: string): boolean {
    const $ = cheerio.load(html);
    return $('input[name="password-new"]').length > 0 ||
           $('input[name="password"]').length > 0;
  }

  private hasProfileFields(html: string): boolean {
    const $ = cheerio.load(html);
    return $('input[name="firstName"]').length > 0;
  }

  private async fetchWithCookies(url: string, options: RequestInit = {}): Promise<Response> {
    const cookies = await this.cookieJar.getCookieString(url);
    const headers = new Headers(options.headers);
    if (cookies) {
      headers.set('Cookie', cookies);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      redirect: 'manual'
    });

    for (const cookie of response.headers.getSetCookie()) {
      await this.cookieJar.setCookie(cookie, url);
    }

    return response;
  }

  async completePasswordSetup(invitationLink: string, newPassword: string, profileData: ProfileData): Promise<void> {
    let currentUrl = invitationLink;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      attempts++;

      const response = await this.fetchWithCookies(currentUrl);

      if (response.status === 302 || response.status === 303) {
        const location = response.headers.get('location');
        if (location) {
          currentUrl = location;
          continue;
        }
      }

      const html = await response.text();

      if (html.includes('Click here to proceed') && !this.hasPasswordField(html) && !this.hasProfileFields(html)) {
        const $ = cheerio.load(html);
        const proceedLink = $('a[href*="action-token"]').attr('href');
        if (proceedLink) {
          currentUrl = proceedLink.replace(/&amp;/g, '&');
          continue;
        }
      }

      if (html.includes('To continue the login process') && !this.hasPasswordField(html) && !this.hasProfileFields(html)) {
        const $ = cheerio.load(html);
        const continueLink = $('a[href*="UPDATE_PROFILE"]').attr('href');
        if (continueLink) {
          currentUrl = continueLink.replace(/&amp;/g, '&');
          continue;
        }
      }

      if (html.includes('successfully') || html.includes('Success')) {
        break;
      }

      if (this.hasProfileFields(html)) {
        const formAction = this.extractFormAction(html);
        if (!formAction) {
          throw new Error('Profile form found but no action URL');
        }

        const formData = new URLSearchParams();
        formData.append('firstName', profileData.firstName);
        formData.append('lastName', profileData.lastName);

        const profileResponse = await this.fetchWithCookies(formAction, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData.toString()
        });

        if (profileResponse.status === 302 || profileResponse.status === 303) {
          const location = profileResponse.headers.get('location');
          if (location) {
            currentUrl = location;
            continue;
          }
        }

        continue;
      }

      if (this.hasPasswordField(html)) {
        const formAction = this.extractFormAction(html);
        if (!formAction) {
          throw new Error('Password form found but no action URL');
        }

        const formData = new URLSearchParams();
        formData.append('password-new', newPassword);
        formData.append('password-confirm', newPassword);

        const passwordResponse = await this.fetchWithCookies(formAction, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData.toString()
        });

        if (passwordResponse.status === 302 || passwordResponse.status === 303) {
          const location = passwordResponse.headers.get('location');
          if (location) {
            currentUrl = location;
            continue;
          }
        }

        continue;
      }

      break;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Max attempts reached while completing password setup');
    }
  }
}
