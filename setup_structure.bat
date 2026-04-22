@echo off
echo Aligning project structure...
mkdir d:\bydar\project\src\routes
mkdir d:\bydar\project\src\features
mkdir d:\bydar\project\src\shared
move d:\bydar\project\src\components\invetory d:\bydar\project\src\components\inventory
move d:\bydar\project\src\App.tsx d:\bydar\project\src\app.tsx
echo Done.
