from picture import Picture

if __name__ == "__main__":
    picture = Picture()
    if not picture.process():
        picture.print_help()

    picture.run()

    while True:
        command = input()
        if not command:
            break
        picture.run_command(command)

