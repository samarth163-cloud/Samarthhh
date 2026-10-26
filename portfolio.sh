# Termainal Portfolio
function projects_menu() {
    echo -e "\e[1;35mChoose a project:\e[0m"
    select choice in "GitHub" "Game Dev" "Projects" "Back"; do
        case $choice in
            "GitHub") echo "Check out my GitHub: github.com/samarth163-cloud" | lolcat;;
            "Game Dev") echo "I've made some cool games! Check them out in my portfolio!" | lolcat;;
            "Projects") echo "See some projects I have made! Visit: https://github.com/samarth163-cloud" | lolcat;;
            "Back") break;;
            *) echo "Invalid choice, try again." | lolcat;;
        esac
    done
}

function exit_effect() {
    echo "Self-destruct sequence initiated..." | pv -qL 10 | lolcat
    sleep 1
    echo "3..." | pv -qL 10 | lolcat
    sleep 1
    echo "2..." | pv -qL 10 | lolcat
    sleep 1
    echo "1..." | pv -qL 10 | lolcat
    figlet "Goodbye!" | lolcat
}

if [ -z "$SSH_TTY" ]; then return; fi
echo "Loading Samarth's Portfolio..." | pv -qL 10 | lolcat

clear

#figlet -f slant "Samarth's Terminal" | lolcat
figlet "Samarth's Terminal" | lolcat

echo "=============================" | lolcat
WELCOME_MSGS=("Hello, traveler!" "Hello, hacker!" "Enter the matrix..." "Ready to code?")
RANDOM_MSG=${WELCOME_MSGS[$RANDOM % ${#WELCOME_MSGS[@]}]}
echo -e "\e[1;34m$RANDOM_MSG 🚀\e[0m" | lolcat

echo -e "\e[1;34mWelcome to my SSH Portfolio! 🚀 \e[0m" | lolcat
echo -e "\e[1;32mI am Samarth, a programmer, developer and creator.\e[0m"
echo -e "\e[1;36mType 'projects' to see my work, 'about' to know more, or 'exit' to leave.\e[0m"
echo -e "\e[1;33mType 'contact' to view my email!\e[0m"
echo "=============================" | lolcat

while true; do
    echo -n "> "
    read input
    case $input in
        projects) projects_menu ;;
        about) echo "I'm a developer who loves building cool things! Type 'web' to view my portfolio website!" | lolcat
                FUN_FACTS=("I started programming at 13!" "I love playing table tennis." "Huge Pokémon fan!" "I enjoy making games!")
                RANDOM_FACT=${FUN_FACTS[$RANDOM % ${#FUN_FACTS[@]}]}    
                echo -e "\e[1;36mFun Fact: $RANDOM_FACT\e[0m" | lolcat
                ;;
        web) echo "Check out my portfolio website!" | lolcat;;
        contact) echo "Email me at: donsamarth163@gmail.com" | lolcat;;
        secret)
            echo "“The best way to predict the future is to invent it.” - Alan Kay" | lolcat
            ;;
        exit) exit_effect; break ;;
        *) echo "Unknown command. Try 'projects', 'about', 'web', 'contact', or 'exit'." ;;
    esac
done


