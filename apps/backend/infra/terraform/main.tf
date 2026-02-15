# Terraform configuration for CometDrive AWS Infrastructure

provider "aws" {
  region = var.aws_region
}

# 1. VPC & Networking
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  name   = "comet-vpc"
  cidr   = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true # For Dev/Test environment
}

# 2. RDS (PostgreSQL)
resource "aws_db_instance" "postgres" {
  allocated_storage    = 20
  storage_type         = "gp3"
  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = "db.t3.micro"
  db_name              = "comet"
  username             = var.db_username
  password             = var.db_password
  parameter_group_name = "default.postgres15"
  skip_final_snapshot  = true

  db_subnet_group_name   = aws_db_subnet_group.default.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
}

resource "aws_db_subnet_group" "default" {
  name       = "comet-db-subnet-group"
  subnet_ids = module.vpc.private_subnets
}

# 3. ECS Fargate Cluster
resource "aws_ecs_cluster" "main" {
  name = "comet-cluster"
}

# 4. ALB (Application Load Balancer)
resource "aws_lb" "main" {
  name               = "comet-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = module.vpc.public_subnets
}

# ... (Simplified for brevity, but shows the intent)
