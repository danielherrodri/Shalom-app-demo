from django.urls import path
from core import views

urlpatterns = [
    path('api/v1/auth/csrf/', views.csrf_token),
    path('api/v1/auth/login/', views.login_view),
    path('api/v1/auth/logout/', views.logout_view),
    path('api/v1/auth/me/', views.me),
    path('api/v1/auth/continue/', views.continue_session),
    path('api/v1/groups/', views.GroupList.as_view()),
    path('api/v1/groups/<uuid:pk>/people/', views.GroupPeople.as_view()),
    path('api/v1/sessions/', views.SessionList.as_view()),
    path('api/v1/attendance/', views.AttendanceCreate.as_view()),
]
