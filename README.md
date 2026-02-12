# BrainFuel - AI-Powered Learning Platform

## Overview
BrainFuel is an AI-powered educational platform built with Django that connects students with teachers. The platform facilitates personalized learning experiences through course materials, study resources, and interactive features.

## Features
- **User Authentication**: Secure login, registration, and profile management
- **Role-Based Access**: Separate interfaces for students and teachers
- **Course Management**: Teachers can create and manage courses
- **Study Materials**: Students can access and create study materials
- **Payment Integration**: Subscription plans for premium content
- **Responsive Design**: Modern UI that works across devices

## Project Structure
- **auth_app**: Handles user authentication and profile management
- **core**: Core functionality including landing page and common features
- **payment**: Subscription plans and payment processing
- **student**: Student-specific features and dashboard
- **teacher**: Teacher-specific features and course management
- **templates**: HTML templates for all app components
- **static**: CSS, JavaScript, and image assets

## Technologies Used
- Django (Python web framework)
- SQLite (Database)
- HTML/CSS/JavaScript (Frontend)
- Bootstrap (UI Framework)

## Installation
1. Clone the repository
    ```bash
    git clone https://github.com/webKing021/BrainFuel-AI-Django.git
    ```

2. To create a virtual environment :
    ```bash
    python -m venv .venv 
    ```

3. To activate virtual environment : 
    ```bash
    .venv\Scripts\activate 
    ```

4. To install Django :
    ```bash
    py -m pip install Django
    ```

5. To create a Django project :
    ```bash
    django-admin startproject <PROJECT_NAME>
    cd .\Krutarth\
    ```

6. To run the created project :
    ```bash
    python manage.py runserver <PORT_NUMBER>
    ```

7. To create an application : 
    ```bash
    django-admin startapp <APP_NAME>
    ```     

8. To connect to MySQL database
    ```bash
    pip install mysqlclient
    ```

9. To create migration
    ```bash
    py manage.py makemigrations
    ```

10. To migrate tables
    ```bash
    py manage.py migrate
    ```

11. To create superuser
    ```bash
    py manage.py createsuperuser
    ```

---

## Email (Mailtrap) Setup

Use Mailtrap to send development emails (verification, password reset) without sending real emails.

1) Create a free Mailtrap account and get your SMTP credentials (Username and Password) from Inbox > SMTP Settings.

2) Add credentials as environment variables (recommended):

   - Windows (PowerShell):
     ```powershell
     setx MAILTRAP_USER "<your_username>"
     setx MAILTRAP_PASS "<your_password>"
     ```

3) Update `BrainFuel/BrainFuel/settings.py` to use the variables:

   ```python
   # Email (Mailtrap)
   EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
   EMAIL_HOST = 'sandbox.smtp.mailtrap.io'
   EMAIL_PORT = '2525'
   EMAIL_USE_TLS = True
   EMAIL_HOST_USER = <your key>
   EMAIL_HOST_PASSWORD = <your key>
   DEFAULT_FROM_EMAIL = 'no-reply@brainfuel.app'
   ```

4) Test email sending in Django shell:

   ```bash
   py manage.py shell
   >>> from django.core.mail import send_mail
   >>> send_mail('Test Email', 'Hello from BrainFuel!', None, ['you@example.com'])
   1
   ```

Open your Mailtrap Inbox to see the message.

---

## Static and Media Files (Django settings)

Add these to `BrainFuel/BrainFuel/settings.py` to serve static assets and user uploads during development:

```python
# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]
STATIC_ROOT = BASE_DIR / 'staticfiles'  # used by collectstatic in production

# Media files (User uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

Notes:
- __Development__: Ensure your root `urls.py` serves media when `DEBUG=True`:
  ```python
  from django.conf import settings
  from django.conf.urls.static import static

  urlpatterns = [
      # ... your URLs here ...
  ] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
  ```
- __Production__: Configure your web server (e.g., Nginx) to serve `/static/` from `STATIC_ROOT` and `/media/` from `MEDIA_ROOT`.

## Database
The project includes a SQL dump file in the Database folder that can be used to restore the database state.

## License
MIT